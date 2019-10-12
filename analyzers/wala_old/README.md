# WALA JSONCallGraph
Here is a running example of applying WALA to generate a JSON representation 
of the internal callgraph of a given JavaScript project.

Essentially WALA will create a CallGraph that indicates which functions
can call eachother.

The result will be the following JSON format
```nodejs
[{
  caller: {
    file: <filename>
    range: [<start>, <end>]
  }
  callee: {
    file: <filename>
    range: [<start>, <end>]
  }
}]
```

# How to run
## Step 1
Clone the [WALA-start project](https://github.com/wala/WALA-start)
`git clone https://github.com/wala/WALA-start.git`

## Step 2
Move JSONCallGraph.java to src/main/java/com/ibm/wala/examples/drivers

# Step 3
Apply the necessary patches to the WALA-start source code
`patch WALA-start/build.gradle build.gradle.patch`

## Step 4
Go into the WALA-start directory and run WALA on a project:
`cd WALA-start`
`python run.py com.ibm.wala.examples.drivers.JSONCallGraph ../test/index.html`

# FAQ
## Edit code
__For eclipse__
* Import the code in eclipse: `File -> Open Projects from File System...`
* Make eclipse aware of all dependent libraries by initializing gradle:
`Right click project -> Configure -> Add Gradle Nature`
``

## export JAR
__From Eclipse__
Export -> JAR
Which will create an standalone JAR file with all dependencies packed inside.

__From commandline__
The patch modified build.gradle that it will export a all dependencies
inside the JAR: `./gradlew jar`

`java -jar ./build/libs/JSONCallGraph-1.0.jar ../test/index.html 2>/dev/null`

## Get clean output
WALA outputs a lot to stderr, the relevant data: the actuall callgraph will
be output on stdout only.

_This works: `java -jar ./build/libs/JSONCallGraph-1.0.jar ../test/index.html 2>/dev/null`_

# NOTES
Some more inspiring references towards this issue are:

[WALA's CallGraph2JSON utility](https://github.com/wala/WALA/blob/master/com.ibm.wala.cast.js/source/com/ibm/wala/cast/js/util/CallGraph2JSON.java)

[Lacuna's WALA Adapter](https://github.com/NielsGrootObbink/Lacuna/blob/master/analyzers/wala_full/WalaCG_full.java)