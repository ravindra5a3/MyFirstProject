const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const http = require('http');
const app = express();

//API file for interacting with MongoDB
const api = require('./server/routes/api');
const services = require('./server/routes/services');
const logisticAdmin = require('./server/routes/logisticAdmin');
const competencyLead = require('./server/routes/competencyLead');
// Parsers
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({ extended: false}));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// Angular DIST output folder
app.use(express.static(path.join(__dirname, 'dist')));

// API location
app.use('/api', api);
app.use('/services', services);
app.use('/logisticAdmin', logisticAdmin);
app.use('/competencyLead', competencyLead);

// Express CORS setup
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});


// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/index.html'));
});

//Set Port
const port = process.env.PORT || '3000';
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => console.log(`Running on localhost:${port}`));

var io = require('socket.io').listen(server);

var usersCollection = [];

// Express routes
app.set("view engine", "vash");


app.post("/listFriends",function(req, res){
  var clonedArray = usersCollection.slice();
  // Getting the userId from the request body as this is just a demo 
  // Ideally in a production application you would change this to a session value or something else
 
  var i = usersCollection.findIndex(x => x.id == req.body.userId);
  console.log('res val',clonedArray);
  clonedArray.splice(i,1);
  res.json(clonedArray);
});

// Socket.io operations
io.on('connection', function(socket){
  console.log('A user has connected to the server.');
  socket.on('logout', function(username) {
    // Same contract as ng-chat.User
      socket.broadcast.emit("disconnect", username);
       socket.broadcast.emit("friendsListChanged", usersCollection);
      console.log('usersCollection',usersCollection);
       console.log('usersCollection',usersCollection.length);
      if(usersCollection.length === 1) {
        usersCollection = [];
      }
     
 }),
 //console.log('login name',sessionStorage.getItem('name'));
  socket.on('join', function(username) {
    // Same contract as ng-chat.User
    usersCollection.push({  
      id: socket.id, // Assigning the socket ID as the user ID in this example
      displayName: username,
      status: 0, // ng-chat UserStatus.Online,
      avatar: null
    });
    console.log('usersCollection.length',usersCollection.length);
    if(usersCollection.length > 1 && usersCollection[0].id !== "idAll") {
      usersCollection.unshift({"id":"idAll","displayName":"All","status":0,"avatar":null});
    }
    socket.broadcast.emit("friendsListChanged", usersCollection);

    console.log(username + " has joined the chat room.");

    // This is the user's unique ID to be used on ng-chat as the connected user.
    socket.emit("generatedUserId", socket.id);

    // On disconnect remove this socket client from the users collection
    socket.on('disconnect', function(data) {
      console.log('User disconnected!',data);
      var i = usersCollection.findIndex(x => x.id == socket.id);
      usersCollection.splice(i, 1);
     // console.log(usersCollection + "members has joined the chat room.");
     console.log('usersCollection.length',usersCollection.length);
      if(usersCollection.length === 2) {
        usersCollection = [];
      }
       socket.broadcast.emit("friendsListChanged", usersCollection);
   });
    
  });

  socket.on("sendMessage", function(message){
    console.log("Message received:");
    console.log("Message sender:",message);
    if(message.toId === 'idAll') {
      message.displayName = 'ALL';
      //message.fromId = 'idAll';
      for(i=1;i<usersCollection.length;i++) {
        console.log('message to all',usersCollection[i]);
        console.log('message to all',usersCollection.length);
          if(message.fromId != usersCollection[i].id)
          {
            io.to(usersCollection[i].id).emit("messageReceived", {
              user: usersCollection.find(x => x.id == message.fromId),
              message: message
            });
          }
        }
    } else { 
     
    io.to(message.toId).emit("messageReceived", {
      user: usersCollection.find(x => x.id == message.fromId),
      message: message
    });
  }

    console.log("Message dispatched.");
  });
});
