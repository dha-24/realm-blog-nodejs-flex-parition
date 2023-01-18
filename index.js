'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Realm = require('realm');
const BSON = require("bson");


var app = express();
app.use(bodyParser.urlencoded({extended: true}));


var dynamicRealm = "NA";
var partitionBasedRealm = "NA";
// await atlasRealm.logIn(Realm.Credentials.anonymous());

const TaskSchema = {
  name: "Task",
  properties: {
    _id: "objectId",
    name: "string",
    status: "string?",
    progressMinutes: "int?",
    owner: "string?",
    // dueDate: "date?",
  },
  primaryKey: "_id",
};

async function configureRealm(){
  const appId = 'XXXXX'; // Set Realm app ID here.
  const appConfig = {
    id: appId,
    timeout: 10000,
  };
  
  const atlasRealm = new Realm.App(appConfig);

  const user = await atlasRealm.logIn(Realm.Credentials.anonymous());
  console.log(`Logged in with the user id: ${user.id}`);

  const GLOBAL = await Realm.open({
    schema: [TaskSchema],
    path:"./local/flexSync/task1",
    sync: {
        user: atlasRealm.currentUser,
        flexible: true,
        initialSubscriptions: {
            update: (subs, realm) => {
              subs.add(
                realm.objects("Task")
              );
            },
          },
    },
});
dynamicRealm = GLOBAL;
return GLOBAL;
}

async function configurePartitionBasedRealm(){
  
  console.log(`Configuring partition based realm`);
  
  const appId = 'YYYYYY'; // Set Realm app ID here.
  const appConfig = {
    id: appId,
    timeout: 10000,
  };
  
  const atlasRealm = new Realm.App(appConfig);

  const user = await atlasRealm.logIn(Realm.Credentials.anonymous());
  console.log(`Logged inside(partitionBased) with the user id: ${user.id}`);

  const GLOBAL = await Realm.open({
    schema: [TaskSchema],
    path:"./local/partSync/sensor2",
    sync: {
        user: atlasRealm.currentUser,
        partitionValue: "sensor2",
    },
});
partitionBasedRealm = GLOBAL;
return partitionBasedRealm;
}




async function testRealmSync() {
  console.log(`test1:`);

  dynamicRealm.write(() => {
  let task;

  task = dynamicRealm.create("Task", {
      _id: new BSON.ObjectID(),
      name: "Q11",
      status:"Q1012",
      owner: "is Computer Science Good or Bad??",
      queprogressMinutessScore: 10
  });
  console.log(`Added task: ${task._id}`);
});

}


async function testPartitionRealmSync() {
  console.log(`test testPartitionRealmSync 1:`);

  partitionBasedRealm.write(() => {
  let task;

  task = partitionBasedRealm.create("Task", {
      _id: new BSON.ObjectID(),
      name: "Q11",
      status:"Q1012",
      owner: "is Computer Science Good or Bad??",
      queprogressMinutessScore: 10
  });
  console.log(`Added task: ${task._id}`);
});

}



////
// _id: "int",
// name: "string",
// status: "string?",
// progressMinutes: "int?",
// owner: "string?",
// dueDate: "date?",
///////////////////////////////////////////

let PostSchema = {
  name: 'Post',
  properties: {
    timestamp: 'date',
    title: 'string',
    content: 'string'
  }
};



var blogRealm = new Realm({
  path: 'blog.realm',
  schema: [PostSchema]
});

app.set('view engine', 'ejs');



app.get('/', function(req, res) {
  let posts = blogRealm.objects('Post').sorted('timestamp', true);
  res.render('index.ejs', {posts: posts});

  
  if(dynamicRealm === "NA"){
    console.log("initializing realm!");
    configureRealm().catch(err => {
      console.error("While initializing realm:", err)
    });
  }

  if(partitionBasedRealm === "NA"){
    console.log("initializing partitionBasedRealm realm!");
    configurePartitionBasedRealm().catch(err => {
      console.error("While initializing partitionBasedRealm realm:", err)
    });
  }


});

app.get('/write', function(req, res) {
  res.sendFile(__dirname + "/write.html");
});

app.post('/write', function(req, res) {
  let title = req.body['title'],
    content = req.body['content'],
    timestamp = new Date();
  blogRealm.write(() => {
    blogRealm.create('Post', {title: title, content: content, timestamp: timestamp});
  });
  console.log("Before testRealmSYnc!");

  testRealmSync().catch(err => {
    console.error("While writing to realm:", err)
  });

  testPartitionRealmSync().catch(err => {
    console.error("While writing to testPartitionRealmSync realm:", err)
  });


  res.sendFile(__dirname + "/write-complete.html");
});


app.listen(3001, function() {
  console.log("Go!");
});
