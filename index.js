const request = require('request');
const argv = require('yargs').argv;
var http = require('http');
const bodyParser = require('body-parser');

const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000
const apiKey = '931352d23bf0035e3f149f95319b1284';

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

var task = [];
var complete = [];
var myWeather = null;
var myEvents = [];

express()
.use(express.static(path.join(__dirname, 'public')))
.use(express.static('public'))
.use(bodyParser.urlencoded({ extended: true }))
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs')
.get('/', function (req, res) {
	//calendarInteract(listEvents);
	res.render('homepage', {weather: myWeather, task: task, events: myEvents});
})
.post('/getWeather', function (req, res) {
	let city = req.body.city;
	let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${apiKey}`
	request(url, function (err, response, body) {
		if(err){
			myWeather = null;
			res.redirect("/");
		} else {
			let weather = JSON.parse(body)
			if(weather.main == undefined){
				weather = null;
				res.redirect("/");
			} else {
				let weatherText = `It's ${weather.main.temp} degrees in ${weather.name}!`;
				myWeather = weatherText;
				res.redirect("/");
			}
		}
	});
})
.post('/addTask', function (req, res) {
	var newTask = req.body.newtask;

	task.push(newTask);

	res.redirect("/");
})
.post("/removetask", function(req, res) {
	var completeTask = req.body.check;

	if (typeof completeTask === "string") {
		complete.push(completeTask);

		task.splice(task.indexOf(completeTask), 1);
		complete = [];
	} else if (typeof completeTask === "object") {
		for (var i = 0; i < completeTask.length; i++) {     
			complete.push(completeTask[i]);
			task.splice(task.indexOf(completeTask[i]), 1);
			complete = [];
		}
	}
	res.redirect("/");
})
.post("/getEvents", function(req, res) {
	calendarInteract(listEvents);
	res.redirect("/");
})
.post("/addEvent", function(req, res) {
	var start = req.body.startTime + ":00-07:00";
	var end = req.body.endTime + ":00-07:00";
	var event = {
 		'summary': req.body.eventTitle,
 		'start': {
 			'dateTime': start,
 			'timeZone': 'America/Los_Angeles',
 		},
 		'end': {
 			'dateTime': end,
 			'timeZone': 'America/Los_Angeles',
 		},
 	};
	calendarInteract(addEvent, event);
	calendarInteract(listEvents, event);

	res.redirect("/");
})
.listen(PORT, () => console.log(`Listening on ${ PORT }`))




// Load client secrets from a local file.
function calendarInteract(callback, event) {
	fs.readFile('credentials.json', (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
        // Authorize a client with credentials, then call the Google Calendar API.
        authorize(JSON.parse(content), callback, event);
    });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
 function authorize(credentials, callback, event) {
 	const {client_secret, client_id, redirect_uris} = credentials.installed;
 	const oAuth2Client = new google.auth.OAuth2(
 		client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
  	if (err) return getAccessToken(oAuth2Client, callback);
  	oAuth2Client.setCredentials(JSON.parse(token));
  	callback(oAuth2Client, event);
  });
}

// *
//  * Get and store new token after prompting for user authorization, and then
//  * execute the given callback with the authorized OAuth2 client.
//  * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
//  * @param {getEventsCallback} callback The callback for the authorized client.

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error retrieving access token', err);
			oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
      	if (err) console.error(err);
      	console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
  });
	});
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
 function listEvents(auth) {
 	myEvents = [];
 	const calendar = google.calendar({version: 'v3', auth});
 	calendar.events.list({
 		calendarId: 'primary',
 		timeMin: (new Date()).toISOString(),
 		maxResults: 10,
 		singleEvents: true,
 		orderBy: 'startTime',
 	}, (err, res) => {
 		if (err) return console.log('The API returned an error: ' + err);
 		const events = res.data.items;
 		if (events.length) {
 			console.log('Upcoming 10 events:');
 			events.map((event, i) => {
 				const start = event.start.dateTime || event.start.date;
 				console.log(`${start} - ${event.summary}`);
 				myEvents.push(`${start} - ${event.summary}`);
 				console.log(myEvents);
 			});
 		} else {
 			console.log('No upcoming events found.');
 			myEvents = [];
 		}
 	});
 }


 function addEvent(auth, event) {
 	// var event = {
 	// 	'summary': 'Google I/O 2015',
 	// 	'location': '800 Howard St., San Francisco, CA 94103',
 	// 	'description': 'A chance to hear more about Google\'s developer products.',
 	// 	'start': {
 	// 		'dateTime': '2018-12-28T09:00:00-07:00',
 	// 		'timeZone': 'America/Los_Angeles',
 	// 	},
 	// 	'end': {
 	// 		'dateTime': '2018-12-28T17:00:00-07:00',
 	// 		'timeZone': 'America/Los_Angeles',
 	// 	},
 	// 	'recurrence': [
 	// 	'RRULE:FREQ=DAILY;COUNT=2'
 	// 	],
 	// 	'attendees': [
 	// 	{'email': 'lpage@example.com'},
 	// 	{'email': 'sbrin@example.com'},
 	// 	],
 	// 	'reminders': {
 	// 		'useDefault': false,
 	// 		'overrides': [
 	// 		{'method': 'email', 'minutes': 24 * 60},
 	// 		{'method': 'popup', 'minutes': 10},
 	// 		],
 	// 	},
 	// };

 	const calendar = google.calendar({version: 'v3', auth});
 	calendar.events.insert({
 		auth: auth,
 		calendarId: 'primary',
 		resource: event,
 	}, function(err, event) {
 		if (err) {
 			console.log('There was an error contacting the Calendar service: ' + err);
 			return;
 		}
 		console.log('Event created: %s', event.htmlLink);
 	});
 }