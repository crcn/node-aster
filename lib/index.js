var __ = fs = require('fs'),
path = require('path'),        
uglify = require('uglify-js'),
parser = uglify.parser;   
                  
/**
 * makes traversing the AST easier
 */   
      
var Expressions = {     
	
	'call': function(walker)
	{                        
		//the func making the call
		var func  = walker.target[1].walker,
		    texpr = walker.target[1].walker.expr,
		 	name = texpr.name;
		                  
		                                                                     
		return { name: name, reference: texpr, params: walker.target[2] };
	},  
	
	//var assignment
	'var': function(walker)
	{                   
		var ast = walker.target;
		                            
		var vars = ast[1],
			values = [];
		                
		for(var i = 0, n = vars.length; i < n; i++)
		{
			var vr   =  vars[i],     
				val  = { name: vr[0] };        
				
			if(vr[1]) val.value = aster(vr[1], walker);   
		   
		 	values.push(vr);     
			                                              
			walker.symbolTable().set(val.name, val.value);
		}           
		
		return values;  
	},  
	
	//dot.syntax.to.obj
	'dot': function(walker)
	{                       
		var ast = walker.target,
		property = ast[1].walker,  
		chain = [],
		ref; 
		                  
		if(property.type == 'name')
		{   
			ref = property.expr.reference;
			chain.push(property.expr.name);
		}                                     
		else
		if(property.type == 'dot')
		{                                                                
			ref = property.expr.reference;
			chain = property.expr.chain;
		}
		else
		{
			console.log('Cannot handle reference chain for %s', property.walker.type);
		}   
		
		chain = chain.concat(walker.rightMost().target);                                                        
		
		return { reference: ref, name: chain[0], chain: chain };
	},
	                          
	//reference to a variable
	'name': function(walker)
	{                          
		var ast = walker.target;  
		                                
		//return the name, along with the reference in the AST
		return { name: ast[1], reference: walker.symbolTable().get(ast[1]) };
	}
}

   
function leftMost(current, parent)
{
	for(var i = 0, n = current.length; i < n; i++)
	{                                            
		//left most must be a string with no children
		if(current[i] instanceof Array) return leftMost(current[i], aster(current));
	}               

	return aster(current, parent);
}   

function rightMost(current, parent)
{
	for(var i = current.length; i--;)
	{                                                                  
		if(typeof current[i] == 'string') return aster(current[i], parent);
		
		var ret = rightMost(current[i], aster(current));
		
		if(ret) return ret;
	}                      
	
	return null;
}         
           
/**
 * contains assignments throughout the AST. 
 */

var getSymbolTable = function(parent)
{                     
	var table = {};
	
	return {     
		
		         
		/**
		 * returns value of name given
		 */
		
		get: function(name)
		{                                                      
			//search local var first, then bubble up.
			return table[name] || (parent ? parent.get(name) : null);
		},  
		
		/**
		 * owner of the given variable
		 */
		
		owner: function(name)
		{
			return table[name] ? this : (parent ? parent.owner(name) : this);
		},
		                                                                     
		/**
		 * sets a value locally, or globally
		 */
		
		set: function(name, value, toOwner)
		{
			if(toOwner) this.owner(name).set(name, value, false);
			table[name] = value;
		}
	}
}

var aster = function(ast, parent)
{      
	if(ast.walker) return ast.walker;     
	
	var symbolTable,
		children = [];
		
	var walker = {  
		target: ast,    
		parent: parent,  
		prepared: false,
		symbolTable: function(value)
		{
			if(value) symbolTable = value;
			
			return symbolTable || (parent ? parent.symbolTable() : walker.symbolTable(getSymbolTable()));
		},  
		leftMost: function()
		{         
			return leftMost(ast);
		},  
		rightMost: function()
		{                             
			return rightMost(ast);
		},    
		index: function()
		{
			return parent.target.indexOf(ast);
		},      
		length: function()
		{
			return ast.length;
		},
		nextSibling: function()
		{ 
			var i = walker.index();
			if(i == -1 || i == parent.target.length - 1) return null;  
			
			return aster(parent.target[i+1], parent);
		},   
		
		/**
		 * sibling from the parent
		 */
		                  
		prevSibling: function()
		{
			var i = walker.index();
			if(i == -1 || i == 0) return null;          
			
			return aster(parent.target[i-1], parent);
		},          
		
		/**
		 * removes the ast
		 */
		
		remove: function()
		{
			var i = walker.index();
			if(i == -1) return null;   
			                             
			parent.target.splice(i, 1);        
			
			walker.parent = parent = undefined;
		},               
		
		/**
		 * prepares the ast for evaluation
		 */
		
		prepare: function()
		{                                 
			if(walker.prepared) return;
			                               
			walker.prepared = true;
			                          
			for(var i = 0, n = ast.length; i < n; i++)
			{                  
				var v = ast[i];
				
				if(v instanceof Array)
				{
					aster(v, walker).prepare();
				}  
			}
		}, 
		
		/**
		 * walks the aster tree
		 */
		
	    walk: function(handlers)
		{               
			//backwards incase the expression is removed     
			for(var i = ast.length; i--;)
			{
				var v = ast[i];
				
				if(v instanceof Array)
				{
					v.walker.walk(handlers);
				}  
				else
				if(handlers[v])
				{
					handlers[v](walker);
				}
			} 
			
			return walker;
		},
		
		/**
		 * writes the expression as a JS string
		 */
		
		toString: function()
		{                     
			return uglify.uglify.gen_code(ast, { beautify: true });
		}
	}             
	
	walker.prepare();
	
	if((ast instanceof Array) && typeof ast[0] == 'string')
	{                     
		var expr = Expressions[ast[0]];
		
		if(!expr)
		{
			console.warn('Expression %s does not exist', ast[0]);     
		}
		else
		{         
			walker.type = ast[0];  
			walker.expr = expr(walker);  
			walker.expr.type = walker.type;
		}                    
	}
	           
	return ast.walker = walker;
}
                                                                                                                      
 

exports.parse = function(source)
{   	
	return aster(parser.parse(source, false, false));
}            

exports.load = function(filePath)
{
	return exports.parse(fs.readFileSync(filePath, 'utf8'));
}
       

//analyize items required in sauce code       


var source = 'var require = "GOOGLE"; var test = require.paths.unshift(some,test,params)'; 

exports.parse(source).walk({
	'call': function(walker)
	{                        
		var func = walker.expr.reference;
		                  
		
		//is the ROOT ref require?
		if(func.name == 'require')
		{                         
			//using dot syntax? probably unshifting paths  
			if(func.type == 'dot' && func.chain[1] == 'paths')
			{   
			}
		}
	}
});
