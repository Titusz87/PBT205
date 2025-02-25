/*

Write a ‘person’ command-line application:

o Start-up arguments:
    o Middleware endpoint;
    o Person identifier;
    o Movement speed (team’s discretion; that is, ‘moves per second’ or ‘fast/slow’
      or other descriptor).

o Behaviour:
    o Connect to the middleware endpoint;
    o Communicate initial (randomised) position to the ‘position’ topic, along with
      the person’s identifier;
    o Continually make a move in a random direction (one square at a time) and
      publish that move to the ‘position’ topic. (Movement speed should accord
      with the start-up argument provided).

*/


//NOT IMPEMENTED YET