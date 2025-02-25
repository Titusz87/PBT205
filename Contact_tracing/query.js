/*

Write a ‘query’ command-line application:

o Start-up arguments:
    o Middleware endpoint;
    o Person identifier.

o Behaviour:
    o Connect to the middleware;
    o Publish the person identifier provided at start-up onto the ‘query’ topic;
    o Await the response on the ‘query-response’ topic from the tracker and print
    that response to the console, then exit.

• Introduce a process representing a person that starts with a position and randomly moves
‘squares’ once every ‘n’ seconds (where ‘n’ is configurable). By ‘moving’, it is simply publishing
a new (x,y coordinate)

• All coordinates are represented by numbers (x,y). You must cater for boundary conditions,
such as a person moving off the board.


Final Product
• Provide a GUI that:
    o Gives a visual representation of the ‘environment’; and
    o Allows a user to query a person identifier and to see with whom they have come into
      contact.
• Extend the solution to work for boards/environments of different sizes.

*/


//NOT IMPLEMENTED YET