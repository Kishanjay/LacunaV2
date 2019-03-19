# Lacuna V2
A cleaner, simpler, production ready version of Lacuna.

`node ./lacuna <sourceFolder> -a static`

## How to use
The intuition is that lacuna runs on a source folder; Relative to this folder 
it will will look for the entry file. From the entry file, all references to 
JS files and all inline JS scripts will be considered for optimization.

__Thus all files that are not referenced by the entry file will be skipped__

### How-to-run
`npm install`

`npm --prefix ./analyzers/static install ./analyzers/static`
`npm --prefix ./analyzers/dynamic install ./analyzers/dynamic`
`npm --prefix ./analyzers/nativecalls install ./analyzers/nativecalls`
`npm --prefix ./analyzers/wala_full install ./analyzers/wala_full`
`npm --prefix ./analyzers/wala_single install ./analyzers/wala_single`

## Runtime options

| Long          | Short | Description                                                    | Default                  |
|---------------|-------|----------------------------------------------------------------|--------------------------|
| --analyzer    | -a    | Specify analyzers (multiple allowed, space separated).         | <REQUIRED>               |
| --entry       | -e    | The entry file, where the JS scripts should be gathered from.  | index.html               |
| --destination | -d    | Perform changes in a copy of the sourceFolder.                 | <sourceFolder>_lacunized |
| --logfile     | -l    | Logs of Lacuna execution.                                      | lacuna_log.json          |
| --verbose     | -v    | Show stdout output.                                            | FALSE                    |
| --olevel      | -o    | Optimization level                                             | 2                        |
| --timeout     | -t    | Timeout in seconds                                             |                          |
| --force       | -f    | Force continuing                                               |                          |

### Analyzer
The currently available analyser options are:
- static
- dynamic
- nativecalls
- wala_single
- wala_full

When multiple analysers are chosen, Lacuna merges the results. Meaning that 
any node found alive by any analyser will be considered alive.

### Entry
The entry file specifies the place where the JS files should be gathered from.
It both looks at the

### Copy
By default Lacuna overwrites the existing project

### Logfile

### Optimization Level

### Verbose

# ChangeLog


## Lacuna (original)
