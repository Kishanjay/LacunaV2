'use strict';

const path = require('path'),
	child_process = require('child_process');
	  
	const lacunaSettings = require("../../_settings");


function run_wala(scripts, folder, callback)
{
	scripts = scripts.map(function (script) { return script.src });
	var jarFile = path.join(__dirname, 'WalaCG_single.jar');
    let command = 'java -jar ' + jarFile + ' ' + folder + ' "' + scripts.join(' ') + '"';
	let settings = {
		maxBuffer: 1024 * 1000 * 1000,	// 1 GB
		timeout: lacunaSettings.ANALYZER_TIMEOUT
	};
 
	// Run the WALA jar.
	console.log("WALA:", command);
	child_process.exec(command, settings, function(error, stdout, stderr) {
		console.log(error, stderr);
		callback(stdout);
	});
}


function get_script_by_file(file, script_data) {
	for(let i = 0; i < script_data.length; i++) {
		let script = script_data[i];

		if(script.full_path == file) {
			return script;
		}
	}

	return null;
}


function parse_script_location(location_string) {
	let splitted = location_string.split('@'),
	    location = splitted[1].split('-');

	return {
		file: splitted[0],
		range: [parseInt(location[0], 10), parseInt(location[1], 10)]
	};
}


function fix_path(file, folder) {
	let f = file.substr(folder.length);

	if(f.indexOf('/') == 0) {
		return f.substr(1);
	} else {
		return f;
	}
}


function fix_caller(caller_location, script_data, folder) {
	let script_info = get_script_by_file(caller_location.file, script_data);

	if(script_info != null) {
		// Remove the path in front of the file name, because the framework expects file names relative to the dir.
		caller_location.file = fix_path(caller_location.file, folder);

		return get_containing_function(caller_location, script_info);
	} else {
		return null;
	}
}


function fix_called(called_location, script_data, folder) {
	let script_info = get_script_by_file(called_location.file, script_data);

	if(script_info != null) {
		// Remove the path in front of the file name, because the framework expects file names relative to the dir.
		called_location.file = fix_path(called_location.file, folder);

		return called_location;
	} else {
		return null;
	}
}


function get_containing_function(called_location, script_info) {
	for(let i = 0; i < script_info.functions.length; i++) {
		let func = script_info.functions[i];

		if(func.start < called_location.start && func.end > called_location.end) {
			called_location.start = func.start;
			called_location.end = func.end;

			return called_location;
		}
	}

	// Not in one of the functions, so global.
	called_location.start = null;
	called_location.end = null;

	return called_location;
}


module.exports = function (runOptions, scripts, callback) {
	run_wala(scripts, runOptions.directory, function (result) {
		let edges = [];
		if (!result) {
			return callback(edges);
		}
		let json = null;
		try {
			json = JSON.parse(result);
		} catch (e) {
			console.log("Invalid JSON ", result);
			return callback(edges);
		}
		if(!json['files']) {
			return callback(edges);
		}
		json = json['files'];

		/* edges are seperated by file */
		for(let file in json) {
			if (!json.hasOwnProperty(file)) continue;
			let funcs = json[file];

			for(let entry in funcs) {
				if (!funcs.hasOwnProperty(entry)) continue;

				let json = funcs[entry];
				let caller_string = entry;
				let callee_string = json[0];

				let caller_location = parse_script_location(caller_string),
					callee_location = parse_script_location(callee_string);
				
				if(caller_location != null && callee_location != null) {
					edges.push({
						caller: caller_location,
						callee: callee_location
					});
				}
				
			}
			
		}

		return callback(edges);
	});
};
