var aster = require('./index');


function scanDeps(sourcePath, callbacks)
{

	if(!callbacks.cache) callbacks.cache = { used: {}, required: [] };
	if(!callbacks.error) callbacks.error = function(){};
	if(!callbacks.end) callbacks.end = function(){};
	if(callbacks.cache.used[sourcePath]) return callbacks.cache.used[sourcePath];
	
	var depInfo = callbacks.cache.used[sourcePath] = {}; 

	try
	{
		var ast = aster.load(sourcePath,'utf8'),	
			cwd = path.dirname(sourcePath);
	}
	catch(e)
	{
		return;
	}

	//npm package?
	if(sourcePath.match(/\/.*?@.*?\//))
	{
		var realPath = ast.walk({
			'var': function(walker)
			{
				var value = walker.values[0];

				if(value && value.name == 'from')
				{
					return value.value.walk({
						'string': function(walker)
						{
							return walker.value;
						}
					})
				}
			}
		});

		return scanDeps(require.resolve(cwd + '/' + realPath), callbacks);
	}

	var requirePaths = [];

	ast.walk({
		'call': function(walker)
		{
			// console.log(walker.reference)
			var ref = walker.reference;

			if(walker.name == 'require' && ref.chain && ref.chain[1] == 'paths' && (ref.chain[2] || '').match(/push|unshift/g))
			{
				requirePaths.push(walker);			
			}
		}
	});

	requirePaths.forEach(function(path)
	{
		try
		{
			eval(path.toString().replace('__dirname',"'"+cwd+"'"));
		}
		catch(e)
		{
			console.log(e);
		}
	});


	var globalVars = ast.symbolTable().symbols().values,
		deps = [];

	for(var varName in globalVars)
	{
		var value = globalVars[varName];

		if(!value) continue;

		if(value.type == 'call' && value.name == 'require')
		{
			var dep = value.walk({
				'string': function(watcher)
				{
					return watcher.value;
				}
			});

			//no dependency? probably request.paths.unshift...
			if(!dep) continue;


			//relative path?
			if(dep.substr(0,1) == '.')
			{
				dep = cwd + '/' + dep;
			}

			try
			{
				dep = require.resolve(dep);
			}
			catch(e)
			{
				callbacks.error({ path: dep, source: sourcePath });
				continue;
			}


			scanDeps(dep, callbacks);
		}
	}


	callbacks.require({ path: sourcePath });
}


scanDeps('/Users/craigcondon/Dropbox/work/Spice/libs/sk/core/pubsub.js', {
	error: function(ops)
	{
		
	},
	require: function(ops)
	{
		console.log(ops.path)
	},
	end: function()
	{
		
	}
});