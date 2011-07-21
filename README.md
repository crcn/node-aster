What's this?
------------

A layer ontop of uglify-js to help make traversing, and handling javascript Abstract Synax Trees easier. 

Why?
----

The tool was original developed [sardines](https://github.com/spiceapps/sardines).

What's does it do exactly?
--------------------------

- Creates expressions out of the arrays uglify-js spits out.
- Identifies defined variables, their references, and their scope, and places them in a Symbol Table.
- Easily walk through the AST.


Code Usage:
-----------

````javascript

var aster = require('aster');

var ast = aster.parse('var hello = "hello", hello2 = "world!"; console.log(hello); var anotherRef = hello;');

var messages = ast.walk({
	'var': function(ast)
	{
		var messages = [];

		ast.values.forEach(function(vr)
		{
			messages.push(vr.name + ' is referenced ' + vr.references().length + ' times.');
		});

		return messages; //stop the walk
	}
});

messages.forEach(function(message)
{

	//hello is referenced 2 times.
	//hello2 is referenced 0 times.
	console.log(message);
});

````


To Do:
-----

- Ability to easily replace expressions in the AST.
- Light evaluation of ASTs (for ability to further transform code).







