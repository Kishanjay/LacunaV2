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

### Installation
Install the dependent libraries `npm install`

Install the dependencies for the different analysers (should only be necessary
if you want to use them)
- `npm --prefix ./analyzers/static install ./analyzers/static`
- `npm --prefix ./analyzers/dynamic install ./analyzers/dynamic`
- `npm --prefix ./analyzers/nativecalls install ./analyzers/nativecalls`
- `npm --prefix ./analyzers/wala_full install ./analyzers/wala_full`
- `npm --prefix ./analyzers/wala_single install ./analyzers/wala_single`

## Runtime options

| Long          | Short | Description                                                    | Default                  |
|---------------|-------|----------------------------------------------------------------|--------------------------|
| --analyzer    | -a    | Specify analyzers (multiple allowed, space separated).         | <REQUIRED>               |
| --entry       | -e    | The entry file, where the JS scripts should be gathered from.  | index.html               |
| --destination | -d    | Perform changes in a copy of the sourceFolder.                 | <sourceFolder>_lacunized |
| --logfile     | -l    | Logs of Lacuna execution.                                      | lacuna.log               |
| --olevel      | -o    | Optimization level                                             | 0                        |
| --timeout     | -t    | Timeout in seconds                                             | -                        |
| --force       | -f    | Force continuing                                               | false                    |

### Analyzer
The currently available analyser options are:
- static
- dynamic
- nativecalls
- wala_single
- wala_full

When multiple analysers are chosen Lacuna merges the results to minimize false
positves. This means that any function that is picked up as alive by ANY 
analyser will be considered alive.

### Entry
The entry file, relative to the sourceFolder, that will serve as a starting 
point for Lacuna. From this file all references to JS files will be gathered,
as well as the inline JS scripts; after which they will be considered for 
optimization.

### Destination
By default Lacuna will preserve the original sourceFolder by placeing the 
optimized version in <sourceFolder>_lacunized.


### Logfile

### Optimization Level

### Verbose

# ChangeLog

## Lacuna (original)
