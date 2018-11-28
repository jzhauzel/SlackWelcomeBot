require('dotenv').load();
// Initialize http
const fs = require('fs')
const http = require('http');
const message = {
  "text": "Yer off the team",
  "attachments": [
    {
      "title": "What is Slack?",
      "text": "Slack is where work happens. Welcome aboard, brave adventurer, to the world of Slack!",
      "color": "#3AA3E3",
      "attachment_type": "default"
    },
    {
      "title": "Code of Conduct",
      "text": " Here at this company, we treat each other with respect and empathy.",
      "callback_id": "accept_terms",
      "color": "#3f1daf",
      "actions": [
        {
          "name": "accept",
          "text": "I Accept",
          "style": "primary",
          "type": "button",
          "value": "accept"
        }
      ]
    }
  ]
};
const updatedCodeOfConduct = {
  "title": "Code of Conduct",
  "text": " Here at this company, we treat each other with respect and empathy.\n :white_check_mark: Thank you for accepting!",
  "callback_id": "accept_terms",
  "color": "#3f1daf"
};
// Initialize the Slack Events API using signing secret from environment variables
const createEventAdapter = require('@slack/events-api').createEventAdapter;
const slackEvents = createEventAdapter(process.env.SLACK_SIGNING_SECRET);
const port = process.env.PORT || 3000;
// Initialize the Web API Client
const { WebClient } = require('@slack/client');
const token = process.env.SLACK_TOKEN;
const slackWeb = new WebClient(token);
// Setting Up Express to be used with the Events API
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
// Setting up this route to be used with the Slack Events middleware
app.use('/slack/events', slackEvents.expressMiddleware());
// Attach listeners to events by Slack Event "type".
slackEvents.on('team_join', (event) => {
  // post message
  console.log(`Received a team_join event: user ${event.user.name} has joined.`);
  slackWeb.chat.postMessage({
    channel: event.user.id,
    text: message.text,
    attachments: message.attachments
  }).then((res) => {
    console.log(`Message sent: ${res.ts}`);
    // store the user's data
    fs.readFile('database.json', (err, data) => {
      if (err) throw err;
      // read the data into your program to be read
      let usersSent = JSON.parse(data);
      // build the object for a specific user to save
      usersSent[event.user.id] = {
          'time_sent': res.message.ts,
          'accepted': false,
          'time_accepted': ''
        };
        // And finally, string up the data, write it back to file!
        let stringifiedUsersSent = JSON.stringify(usersSent);
        fs.writeFile('database.json', stringifiedUsersSent, () => {
          if (err) throw err;
        console.log(`data saved for user ${event.user.id}`);
      });
    });
  }).catch(console.error);
});
app.post('/slack/button', bodyParser.urlencoded({ extended: true }), (req, res) => {
  const sendData = JSON.parse(req.body.payload);
  const user = sendData.user.id;
  const timeAccepted = sendData.action_ts;
  fs.readFile('database.json', (err, data) => {
  if (err) throw err;
  let acceptDatabase = JSON.parse(data);
  acceptDatabase[user].accepted = true;
  acceptDatabase[user].time_accepted = timeAccepted;
  let stringifiedAcceptDatabase = JSON.stringify(acceptDatabase);
  fs.writeFile('database.json', stringifiedAcceptDatabase, (err) => {
    if (err) throw err;
    res.sendStatus(200);
    console.log(`${user} has accepted the code of conduct.`);
    // update
slackWeb.chat.update({
  channel: sendData.channel.id,
  ts: sendData.message_ts,
  attachments: [sendData.original_message.attachments[0], updatedCodeOfConduct]
}).then(() => {
  console.log(`Message updated! ${timeAccepted}`);
}).catch(console.error);
  });
});
});
// Handle errors (see `errorCodes` export)
slackEvents.on('error', console.error);
// Start a basic HTTP server
http.createServer(app).listen(port, () => {
  console.log(`server listening on port ${port}`);
});
