/*

Write a ‘tracker’ command-line application:

o Start-up arguments:
    o Middleware endpoint.

o Behaviour:
    o Subscribe to the ‘position’ topic:
        • Keep a ‘view of the environment’ detailing each person’s current
          position;
        • If two (2) people occupy the same position, log this fact in a suitable
          data structure.
    o Subscribe to the ‘query’ topic:
        • When a person identifier is placed into the ‘query’ topic, respond to
        the ‘query-response’ topic with all the names that person came into
        contact with onto the console in reverse-chronological order.

*/


//NOT IMPEMENTED YET