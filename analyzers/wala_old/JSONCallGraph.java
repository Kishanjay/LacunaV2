package com.ibm.wala.examples.drivers;

import java.io.File;
import java.io.IOException;
import java.net.URL;

import com.ibm.wala.cast.js.ipa.callgraph.JSCFABuilder;
import com.ibm.wala.cast.js.loader.JavaScriptLoader;
import com.ibm.wala.cast.js.translator.CAstRhinoTranslatorFactory;
import com.ibm.wala.cast.js.types.JavaScriptMethods;
import com.ibm.wala.cast.loader.AstMethod;
import com.ibm.wala.cast.tree.CAstSourcePositionMap.Position;
import com.ibm.wala.cast.types.AstMethodReference;
import com.ibm.wala.classLoader.CallSiteReference;
import com.ibm.wala.classLoader.IMethod;
import com.ibm.wala.examples.analysis.js.JSCallGraphBuilderUtil;
import com.ibm.wala.ipa.callgraph.CGNode;
import com.ibm.wala.ipa.callgraph.CallGraph;
import com.ibm.wala.util.CancelException;
import com.ibm.wala.util.WalaException;

import java.util.Iterator;
import java.util.Set;
import java.util.function.Function;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;

public class JSONCallGraph {

	public static void main(String[] args)
			throws IllegalArgumentException, IOException, CancelException, WalaException {

		if (args.length < 1) {
			System.out.println("Usage: JSONCallGraph <entry_file>");
			System.exit(1);
		}
		
		File entryFile = new File(args[0]);
		URL UrlOfEntryFile = entryFile.toURI().toURL();
		
		/* Used to check the location of nodes to verify validity */
		String baseDir = entryFile.getParent();

		/* Builds the CallGraph using the WALA framework */  
		com.ibm.wala.cast.js.ipa.callgraph.JSCallGraphUtil.setTranslatorFactory(new CAstRhinoTranslatorFactory());
		JSCFABuilder builder = JSCallGraphBuilderUtil.makeHTMLCGBuilder(UrlOfEntryFile);
		CallGraph cg = builder.makeCallGraph(builder.getOptions());
		
		/* Creates the JSON */
		System.out.println(CGToJSON(cg, baseDir).toString());
	}
	
	
	/**
	 * Converts a CallGraph to a JSONArray containing all edges
	 */
	public static JSONArray CGToJSON(CallGraph cg, String baseDir) {
		JSONArray edges = extractEdges(cg, baseDir);
		return edges;
	}

	/**
	 * Function that will extract all edges of a call graph (to JSON format)
	 * Most important functions here are the serializeCallSite, which will extend the edges through the pointer
	 * 
	 * Note: doesn't and should'nt prevent duplicates.
	 */
	@SuppressWarnings("unchecked")
	public static JSONArray extractEdges(CallGraph cg, String baseDir) {
		JSONArray edges = new JSONArray();
		
		for (CGNode nd : cg) {
			if (!isRealFunction(nd.getMethod())) { continue; }
			
			/* The actual nodes of the CallGraph aren't always functions */
			AstMethod method = (AstMethod) nd.getMethod();
			for (Iterator<CallSiteReference> iter = nd.iterateCallSites(); iter.hasNext();) {
				
				/* extract caller information, only returns a value is the caller was a valid function */
				CallSiteReference callsite = iter.next();
				JSONObject caller = getJSONNode(method.getSourcePosition(callsite.getProgramCounter()), baseDir);
				if (caller == null) { continue; } /* invalid caller */
				
				/* extract callee information */
				Set<IMethod> targets = com.ibm.wala.util.collections.Util.mapToSet(
					cg.getPossibleTargets(nd, callsite), 
					new Function<CGNode, IMethod>() { 
						@Override public IMethod apply(CGNode nd) { return nd.getMethod(); } 
					}
				);

				/* Convert the caller and callee relations to JSONEdges */
				JSONArray edgesOfCaller = getJSONEdges(caller, targets, baseDir);
				
				edges.addAll(edgesOfCaller);
			}
		}
		return edges;
	}
	
	/**
	 * Creates a set of Edges in the format:
	 * {
	 * 	caller: <JSONObject>,
	 * 	callee: <JSONObject>
	 * }
	 * 
	 * 
	 * Each JSONObject looking like:
	 * {
	 * 	file: <String>
	 *  range: [<Integer>, <Integer>]
	 * }
	 */
	@SuppressWarnings("unchecked")
	public static JSONArray getJSONEdges(JSONObject caller, Set<IMethod> targets, String baseDir) {
		JSONArray edgesOfCaller = new JSONArray();
		
		for (IMethod target : targets) {
			target = getCallTargetMethod(target);
			if (!isRealFunction(target)) { continue; }
			
			JSONObject edge = new JSONObject();
			edge.put("caller", caller);
			
			JSONObject callee = getJSONNode(((AstMethod)target).getSourcePosition(), baseDir);
			edge.put("callee", callee);
			
			edgesOfCaller.add(edge);
		}
		
		return edgesOfCaller;
	}

	/**
	 * Converts the Node to a JSONObject
	 * @returns
	 * {
	 * 	file: <String> 
	 *  range: [<Integer>, <Integer>]
	 * } 
	 * 
	 * OR
	 * 
	 * <NULL> when the baseDir is not present in the claimed filename
	 * IS necessary due to the internal definition of a Node by WALA
	 * essentially not only functions are considered Nodes, therefore to avoid the 
	 * non-function Nodes we check if the baseDir was present in the filename.
	 */
	@SuppressWarnings("unchecked")
	public static JSONObject getJSONNode(Position pos, String baseDir) {
		JSONObject node = new JSONObject();
		
		/* Extract filename */
		String filename = pos.getURL().getFile();
		int index = filename.indexOf(baseDir);

		if (index < 0) { /* invalid filename */
			return null;
		}
		String relativeFilename = filename.substring(index + baseDir.length() + 1); /* filename relative to the entry file */
		node.put("file", relativeFilename);
	
		/* Extract start and end range */
		int startOffset = pos.getFirstOffset(), endOffset = pos.getLastOffset();
		JSONArray range = new JSONArray();
		range.add(startOffset);
		range.add(endOffset);
		node.put("range", range);
		
		return node;
	}

	
	private static IMethod getCallTargetMethod(IMethod method) {
		if (method.getName().equals(JavaScriptMethods.ctorAtom)) {
			method = method.getDeclaringClass().getMethod(AstMethodReference.fnSelector);
			if (method != null) { return method; }
		}
		return method;
	}

	public static boolean isRealFunction(IMethod method) {
		if (method instanceof AstMethod) {
			String methodName = method.getDeclaringClass().getName().toString();

			// exclude synthetic DOM modelling functions
			if (methodName.contains("/make_node"))
				return false;

			for (String bootstrapFile : JavaScriptLoader.bootstrapFileNames)
				if (methodName.startsWith("L" + bootstrapFile + "/"))
					return false;

			return method.getName().equals(AstMethodReference.fnAtom);
		}
		return false;
	}
}
