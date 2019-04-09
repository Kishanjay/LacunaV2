# Lacuna V2
A cleaner, simpler, production ready version of Lacuna.

`node ./lacuna <sourceFolder> -a static`

_Note if the entry file isn't index.html, specify it using the entry param_


Lacuna can also be integrated in any nodeJS project:
```nodejs
const lacuna = require("./lacuna_runner")
lacuna.run(runOptions);
```

## How to use
The intuition is that lacuna runs on a source folder; Relative to this folder 
it will will look for the entry file. From the entry file, all references to 
JS files and all inline JS scripts will be considered for optimization.

__Thus all files that are not referenced by the entry file will be skipped__


### Runtime options

| Long          | Short | Description                                                    | Default                  |
|---------------|-------|----------------------------------------------------------------|--------------------------|
| --analyzer    | -a    | Specify analyzers (multiple allowed, space separated).         | <REQUIRED>               |
| --olevel      | -o    | Optimization level                                             | 0                        |
| --entry       | -e    | The entry file, where the JS scripts should be gathered from.  | index.html               |
| --destination | -d    | Perform changes in a copy of the sourceFolder.                 | <sourceFolder>_lacunized |
| --logfile     | -l    | Logs of Lacuna execution.                                      | lacuna.log               |
| --force       | -f    | Force continuing                                               | false                    |

#### Analyzer
The analyzers are the techniques that Lacuna applies to mark functions/nodes as 
alive and determine caller-callee relationships between functions.

When multiple analysers are chosen Lacuna merges the results to minimize false
positves. This means that any function that is picked up as alive by ANY 
analyser will be considered alive.

The currently available analyser options are
##### static
This analyzer is based on esprima and statically determines all caller -> callee
relationships between functions. It does not consider JavaScript native
functions.

##### nativecalls
Very similair to the static analyzer wich the main difference is that it only
considers JavaScript native functions.

##### dynamic
A basic dynamic analyzer that starts up a puppeteer webdriver and marks every
function that is executed on startup as alive.

##### wala_single
** todo **

##### wala_full
** todo **

#### Optimization Level
After the deadfunctions have been identified, Lacuna can also optimize the 
application by (partially) removing the dead functions. For this optimization, 
Lacuna supports multiple levels of caution.

- 0: Do not optimize at all
- 1: Replace the function body with a lazy loading mechanism
- 2: Remove the function body
- 3: Replace the function definition with null
- 4: Remove the function reference entirely

Since there is no guarantee that Lacuna will not yield false positives e.g.
that it thinks a function that is really alive is dead, removing the functions
entirely could break the application.

#### Entry
The entry file, relative to the sourceFolder, that will serve as a starting 
point for Lacuna. From this file all references to JS files will be gathered,
as well as the inline JS scripts; after which they will be considered for 
optimization.

#### Destination
By default Lacuna will preserve the original sourceFolder by outputting the 
optimized version in <sourceFolder>_lacunized.

By setting the destination option the destination folder can be changed.
_Note: setting the destinationFolder to the sourceFolder will overwrite the
existing application_

#### Logfile
Where the output of Lacuna will be stored. By default in `lacuna.log`

#### Force
When the force option is enabled, Lacuna will without warning overwrite any
files or folders. (Instead of the default to prompt it to the user)

## Installation
Install the dependent libraries `npm install`

Install the dependencies for the different analysers (should only be necessary
if you want to use them)
- `npm --prefix ./analyzers/static install ./analyzers/static`
- `npm --prefix ./analyzers/dynamic install ./analyzers/dynamic`
- `npm --prefix ./analyzers/nativecalls install ./analyzers/nativecalls`
- `npm --prefix ./analyzers/wala_full install ./analyzers/wala_full`
- `npm --prefix ./analyzers/wala_single install ./analyzers/wala_single`


## Development

### Issues
- The dynamic analyzer that requires a webdriver doesn't seem to load external
JS files in headless mode. The work around currently used is to not run the 
browser in headless mode; which has the anoying consequence that it activates/
focusses the window on every run. 