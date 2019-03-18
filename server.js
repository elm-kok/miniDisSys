var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var mongoose = require("mongoose");

app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var Message = mongoose.model("Message", {
  name: String,
  group: String,
  message: String,
  time: Date
});

var User = mongoose.model("User", {
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: true,
    auto: true
  },
  name: String,
  group: String,
  time: Date
});

var dbUrl = "mongodb://localhost:27017/parallel-db";

app.get("/messages", (req, res) => {
  Message.find({}, (err, messages) => {
    res.send(messages);
  });
});

app.get("/messages/group/:group", (req, res) => {
  var group_id = req.params.group;
  Message.find({ group: group_id }, (err, messages) => {
    res.send(messages);
  });
});

app.get("/user/:user/:group", (req, res) => {
  var user = req.params.user;
  var group_ = req.params.group;
  User.find({ name: user, group: group_ }, (err, messages) => {
    res.send(messages);
  });
});

app.post("/messages", async (req, res) => {
  try {
    var message = new Message(req.body);
    var savedMessage = await message.save();
    console.log("saved");

    var censored = await Message.findOne({ message: "badword" });
    if (censored) await Message.remove({ _id: censored.id });
    else io.emit("message", req.body);
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
    return console.log("error", error);
  } finally {
    console.log("Message Posted");
  }
});

app.post("/users", async (req, res) => {
  var user = new User(req.body);
  User.findOneAndUpdate(
    { name: user.name, group: user.group },
    {
      $set: { name: user.name, group: user.group, time: user.time }
    },
    { upsert: true, returnNewDocument: true },
    (err, messages) => {
      if (err) console.log(err);
    }
  );
});

io.on("connection", () => {
  console.log("a user is connected");
});

mongoose.connect(dbUrl, { useMongoClient: true }, err => {
  if (err) console.log("mongodb connected", err);
  else console.log("connection success!");
});

var server = http.listen(3000, () => {
  console.log("server is running on port", server.address().port);
});
