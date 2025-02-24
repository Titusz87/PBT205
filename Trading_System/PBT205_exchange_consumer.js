var amqp = require('amqplib/callback_api');
//const { logger } = require('./loggerService') // do we want this??

var connectionString = `amqp://${encodeURIComponent('admin')}:${encodeURIComponent('GoLLy7710')}@vanelsen.chickenkiller.com:5672`;
const QUEUE = "Orders";
let acceptable_price = true;

const exchange = function (middleware_endpoint) {
    console.log("Attempting to connect to RabbitMQ...");
    amqp.connect(middleware_endpoint, function (error0, connection) {
        if (error0) {
            console.error("Error connecting to RabbitMQ:", error0);
            return;
        }
        console.log("Connected to RabbitMQ successfully!");

        connection.createChannel(function (error1, channel) {
            if (error1) {
                console.error("Error creating channel:", error1);
                return;
            }
            console.log("Channel created successfully!");

            let queue = QUEUE;

            channel.assertQueue(queue, {
                durable: false
            }, function (error2, ok) {
                if (error2) {
                    console.error("Error asserting queue:", error2);
                    return;
                }
                console.log("Queue asserted successfully!");

                // Initialize order book
                let orderBook = {
                    buy_orders: [], // Stores BUY orders
                    sell_orders: [] // Stores SELL orders
                };

                channel.consume(queue, function (msg) {
                    console.log("Received %s", msg.content.toString());

                    try {
                        let order = JSON.parse(msg.content.toString());

                        // Adds order to the order book
                        if (order.side == "BUY"){
                            orderBook.buy_orders.push(order);
                        }
                        else if (order.side == "SELL"){
                            orderBook.sell_orders.push(order);
                        }

                        // Match BUY and SELL orders
                        matchOrders(orderBook, channel);

                        // Acknowledge the message
                        channel.ack(msg);

                    }catch(error){
                        console.error("Error parsing message content:", error);
                    }
                }, {
                    noAck: false // Manually acknowledge messages
                });
            });
        });
    });
};

const matchOrders = function(orderBook ,channel){

    for(let i = 0; i < orderBook.buy_orders.length; i++){
        for(let j = 0; j < orderBook.sell_orders.length; j++){
            let buyOrder = orderBook.buy_orders[i];
            let sellOrder =orderBook.sell_orders[j];
            
            if(buyOrder.price >= sellOrder.price){
                // Create a trade object
                let trade = {
                    buyer: buyOrder.username,
                    seller: sellOrder.username,
                    quantity: buyOrder.quantity,
                    price: buyOrder.price, 
                    timestamp: new Date().toISOString()
                };
            
                // Publish trade object to the "Trades" queue
                channel.assertQueue("Trades", {
                    durable: false
                }, function(error2, ok) {
                    if (error2) {
                        console.error("Error asserting queue:", error2);
                        return;
                    }
                    console.log("Queue asserted successfully!");
                
                channel.sendToQueue("Trades", Buffer.from(JSON.stringify(trade)));
                console.log("Latest trade price for YZ Corp stock: $%s", trade.price);

                // Remove traded orders from orderBook
                orderBook.buy_orders = orderBook.buy_orders.filter((_, index) => index !== i);
                orderBook.sell_orders = orderBook.sell_orders.filter((_, index) => index !== j);
            });
                
            }
        }
    }

}

exchange(connectionString);