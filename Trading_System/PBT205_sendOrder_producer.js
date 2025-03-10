#!/usr/bin/env node

/*

Write a ‘sendOrder’ command-line application.
o Start-up arguments:
    o A username;
    o Middleware endpoint;
    o A SIDE (‘BUY’ or ‘SELL’);
    o A QUANTITY (an integer). For this assignment, the quantity will be fixed at 100
      shares on every order;
    o A price (a double).
o Behaviour:
This program should simply start up, connect to the endpoint, submit its order
to the ‘orders’ topic and then exit immediately.

Final Product
• Expose a simple GUI interface that displays the latest price at which XYZ Corp traded.
• Extend the functionality to allow for multiple stocks.

*/

var amqp = require('amqplib/callback_api');
const readline = require('readline');
//const { logger } = require('./loggerService')
// implement the above {logger} instead console.log

var connectionString = `amqp://${encodeURIComponent('admin')}:${encodeURIComponent('GoLLy7710')}@vanelsen.chickenkiller.com:5672`;
const EXCHANGE = "Orders";

const sendOrder = function (username, middleware_endpoint, side, quantity, price){
    const randomId = Math.random().toString(36).substring(2, 9); // Generates a 7-character random string
    let order = {
        endpoint: middleware_endpoint,
        username: username,
        side: side,
        quantity: quantity,
        price: price,
        id: randomId
    };

    console.log("Attempting to connect to RabbitMQ..."); 
    amqp.connect(connectionString, function(error0, connection) {
        if (error0) {
            console.error("Error connecting to RabbitMQ:", error0);
        }
        console.log("Connected to RabbitMQ successfully!"); 

        connection.createChannel(function(error1, channel) {
            if (error1) {
                console.error("Error creating channel:", error1);
            }
            console.log("Channel created successfully!");

            var queue = 'Orders';
    
            channel.assertQueue(queue, {
                durable: true               // updated to ensure messages are not lost after server failure or restart
            }, function(error2, ok) {
                if (error2) {
                    console.error("Error asserting queue:", error2);
                    return;
                }
                console.log("Queue asserted successfully!");
            
            if (!order || !order.id) {
                console.error("Invalid order object:", order);
                return;
            }

            channel.sendToQueue(queue, Buffer.from(JSON.stringify(order)));
    
            console.log("Order with ID #%s is sent", order.id);
        });
    });
        setTimeout(function() {
            connection.close();
            process.exit(0);
        }, 500);
    });
}

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Prompt the user for order details
rl.question('Enter your username: ', (username) => {
        rl.question('Enter order side (BUY/SELL): ', (side) => {
                rl.question('Enter price: ', (price) => {
                    // Close the readline interface
                    rl.close();

                    // Convert price to numbers
                    price = parseFloat(price);

                    // Validate input
                    if (isNaN(price)) {
                        console.error("Invalid price value. Please enter numeric values.");
                        process.exit(1);
                    }

                    // Call the sendOrder function with user input.               100 is fixed
                    sendOrder(username, "vanelsen.chickenkiller.com:5672`", side, 100, price);
                });
            });
        });
