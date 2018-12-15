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

// const { Pool } = require('pg');
// const pool = new Pool({
// 	connectionString: process.env.DATABASE_URL,
// 	sslmode: require
// 	//ssl: false
// });

const { Client } = require('pg');

const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: true,
});

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
var myForecast = null;
var myZipcode = null;

express()
.use(express.static(path.join(__dirname, 'public')))
.use(express.static('public'))
.use(bodyParser.urlencoded({ extended: true }))
.set('views', path.join(__dirname, 'views'))
.set('view engine', 'ejs')
.get('/', function (req, res) {
	//calendarInteract(listEvents);
	res.render('homepage', {weather: myWeather, forecast: myForecast, task: task, events: myEvents});
})
.get('/db', async (req, res) => {
	
	client.query('SELECT * FROM users;', (err, res) => {
		if (err) {
			console.log(err); 
			throw err; 
		}
		console.log("no error");
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
		client.end();
	});

	// try {
	// 	const client = await pool.connect()
	// 	const result = await client.query('SELECT * FROM users');
	// 	const results = { 'results': (result) ? result.rows : null};
	// 	console.log(results);
	// 	results.forEach(function(r) {
	// 		myZipcode = r.zipcode;
	// 	});
	// 	client.release();
	// } catch (err) {
	// 	console.error(err);
	// 	res.send("Error " + err);
	// }
	res.redirect("/");
})
.post('/getWeather', function (req, res) {
	if (myZipcode !== null) {
		let zip = req.body.zip;
	}
	else {
		let zip = myZipcode;
	}
	let currUrl = `http://api.openweathermap.org/data/2.5/weather?zip=${zip},us&units=imperial&appid=${apiKey}`
	let forecastUrl = `http://api.openweathermap.org/data/2.5/forecast?zip=${zip},us&units=imperial&appid=${apiKey}`
	request(currUrl, function (err, response, body) {
		if(err){
			myWeather = null;
			res.redirect("/");
		} else {
			let weather = JSON.parse(body)
			if(weather.main == undefined){
				weather = null;
				//res.redirect("/");
			} else {
				var currWeather = {
					'city': weather.name,
					'temp': weather.main.temp,
					'condition': weather.weather[0].main,
					'icon': weather.weather[0].icon,
				};
				//let weatherText = `It's ${weather.main.temp} degrees in ${weather.name}!`;
				myWeather = currWeather;
				//res.redirect("/");
			}
		}
	});
	request(forecastUrl, function (err, response, body) {
		if(err){
			myForecast = null;
			res.redirect("/");
		} else {
			let forecast = JSON.parse(body)
			if(forecast.list == undefined){
				myForecast = null;
				console.log(null);
				res.redirect("/");
			} else {
				myForecast = parseForecast(forecast);
				console.log(myForecast);
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



function parseForecast(forecast) {
	console.log(forecast);
	var day1 = readDate(forecast.list[5].dt_txt);
	var day2 = readDate(forecast.list[13].dt_txt);
	var day3 = readDate(forecast.list[21].dt_txt);
	var day4 = readDate(forecast.list[29].dt_txt);
	var day5 = readDate(forecast.list[37].dt_txt);

	var high = [];
	var low = [];
	var j = 0;
	var tempHigh;
	var tempLow;

	for (var i = 0; i < forecast.cnt; i++) {
		if (i % 8 == 1) {
			tempHigh = forecast.list[i].main.temp;
			tempLow = forecast.list[i].main.temp;
		}
		if (forecast.list[i].main.temp > tempHigh) {
			tempHigh = forecast.list[i].main.temp;
		}
		if (forecast.list[i].main.temp < tempLow) {
			tempLow = forecast.list[i].main.temp;
		}
		if (i % 8 == 0 && i != 0) {
			high[j] = tempHigh;
			low[j] = tempLow;
			j++;
		}
	}


	var currForecast = {
		"days" : [
		{'date' : day1,
		'temp': forecast.list[5].main.temp,
		'high': high[0],
		'low': low[0],
		'condition': forecast.list[5].weather[0].main,
		'icon': forecast.list[5].weather[0].icon,},
		{'date' : day2,
		'temp': forecast.list[13].main.temp,
		'high': high[1],
		'low': low[1],
		'condition': forecast.list[13].weather[0].main,
		'icon': forecast.list[13].weather[0].icon,},
		{'date' : day3,
		'temp': forecast.list[21].main.temp,
		'high': high[2],
		'low': low[2],
		'condition': forecast.list[21].weather[0].main,
		'icon': forecast.list[21].weather[0].icon,},
		{'date' : day4,
		'temp': forecast.list[29].main.temp,
		'high': high[3],
		'low': low[3],
		'condition': forecast.list[29].weather[0].main,
		'icon': forecast.list[29].weather[0].icon,},
		{'date' : day5,
		'temp': forecast.list[37].main.temp,
		'high': high[4],
		'low': low[4],
		'condition': forecast.list[37].weather[0].main,
		'icon': forecast.list[37].weather[0].icon,},
		],
	};

	return currForecast;
}

function readDate(dateTime) {
	//2018-12-12 21:00:00
	var myDateTime = dateTime.split(" ");
	var date = myDateTime[0].split("-");

	var year = date[0];
	var month = date[1];
	var day = date[2];

	var readDate = month + "/" + day + "/" + year;
	return readDate;
}




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

function readableDate(dateTime){
	//2018-12-11T10:00:00-07:00
	var myDateTime = dateTime.split("T");
	var date = myDateTime[0].split("-");
	var time = myDateTime[1].split(":");

	var year = date[0];
	var month = date[1];
	var day = date[2];

	var hour = time[0];
	var minute = time[1];

	var dayNight;

	if (hour > 12) {
		dayNight = "PM";
		hour = hour - 12;
	}
	else {
		dayNight = "AM";
	}

	var readableString = month + "/" + day + "/" + year + "  " + hour + ":" + minute + dayNight;
	return readableString;
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
 				var readDate = readableDate(start);
 				console.log(`${readDate} - ${event.summary}`);
 				myEvents.push(`${readDate} - ${event.summary}`);
 				console.log(myEvents);
 			});
 		} else {
 			console.log('No upcoming events found.');
 			myEvents = [];
 		}
 	});
 }


 function addEvent(auth, event) {

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