var https = require('https');
var request = require('request');

module.exports = {
	getWateringAppointments: getWateringAppointments,
	sendSummaryEmail: sendSummaryEmail
}

var calendarHostName = "outlook.office365.com";

function getWateringAppointments(startDate, endDate, callback) {
	request({
	    url: "https://" + calendarHostName + "/api/v1.0/me/calendarview?startDateTime=" + startDate.toISOString() + "&endDateTime=" + endDate.toISOString() + "&$select=Subject,Start,End,Location,Id&$filter=Subject eq 'Water'&$orderBy=Start,End",
		method: "GET",
		headers: {
			'Authorization': 'Bearer ' + user.aadTokens.accessToken
		},
		port: 443,
	    json: true
	}, function (error, response, body){
		if (error) console.log(error);
		callback(error, response);
	});
}

function createFriendlyTimeString(dateString) {
	var date = new Date(dateString);
	var hours = date.getHours();
	var minutes = date.getMinutes();
	
	if (minutes < 10) minutes = "0" + minutes;
	var suffix = "AM";
	if (hours >= 12) {
		suffix = "PM";
		hours = hours - 12;
	}
	if (hours == 0) {
		hours = 12;
	}
	
	return hours + ":" + minutes + " " + suffix;
}

function getStartOfDayWithOffsetFromToday(offset) {
	var date = new Date();
	date.setDate(date.getDate() + offset);
	date.setHours(0);
	date.setMinutes(0);
	date.setSeconds(0);
	date.setMilliseconds(0);
	
	return date;
}

function sendSummaryEmail(user) {
	var startDate = getStartOfDayWithOffsetFromToday(-1);
	var endDate = getStartOfDayWithOffsetFromToday(1);
			
	getHistoricalData(startDate, endDate, user, function(err, calendarResponseData) {
		var calendarEvents = calendarResponseData;
		var alternateEmailContent = "<p>Summary of your meetings on " + startDate.toDateString() + "</p>";
		alternateEmailContent += createHtmlTableFromEvents(
			calendarEvents, 
			[
				{displayName: "Start", field: "Start", processor: createFriendlyTimeString},
				{displayName: "Subject", field: "Subject"},
				{displayName: "Organizer", field: "Organizer.EmailAddress.Name"},
				{displayName: "Location", field: "Location.DisplayName"},
				{displayName: "Body Preview", field: "BodyPreview"},
				{displayName: "Average Heart Rate", field: "AverageHeartRate"},
				{displayName: "Steps Taken", field: "StepsTaken"}
			]
		);
		// var emailContent = "<p>Summary of your meetings on " + startDate.toDateString() + "</p>";
		// emailContent += "<table><tr><td>Start</td><td>Subject</td><td>Organizer</td><td>Location</td><td>Body Preview</td><td>Average Heart Rate</td><td>Steps Taken</td></tr>";
		// for (var i = 0; i < calendarEvents.length; i++) {
		// 	var event = calendarEvents[i];
		// 	var startTime = new Date(event.Start);

		// 	emailContent += "<tr><td>" + createFriendlyTimeString(startTime);
		// 	emailContent += "</td><td>" + event.Subject;
		// 	emailContent += "</td><td>" + event.Organizer.EmailAddress.Name;
		// 	emailContent += "</td><td>" + event.Location.DisplayName;
		// 	emailContent += "</td><td>" + event.BodyPreview;
		// 	emailContent += "</td><td>" + event.AverageHeartRate;
		// 	emailContent += "</td><td>" + event.StepsTaken;
		// 	emailContent += "</td></tr>";  
		// }
		// emailContent += "</table>";
		
		var emailMessage = {
			Message: {
				Subject: 'HR Predictor - ' + startDate.toDateString(),
				Body: {	ContentType: 'HTML', Content: alternateEmailContent },
				ToRecipients: [	{ EmailAddress: { Address: user.aadTokens.idToken.unique_name } } ],
			},
			SaveToSentItems: false
		};

		request({
		    url: "https://" + calendarHostName + "/api/v1.0/me/sendMail",
			method: "POST",
			headers: {
				'Authorization': 'Bearer ' + user.aadTokens.accessToken
			},
			port: 443,
		    json: true,
		    body: emailMessage
		}, function (error, response, body){
			if (error) console.log(error);
		});		
	});
}

function createHtmlTableFromEvents(events, properties) {
	var tableString = "<table><tr>";
	for (var i = 0; i < properties.length; i++) {
		tableString += "<td>" + properties[i].displayName + "</td>";
	}
	tableString += "</tr>";
	
	for (var i = 0; i < events.length; i++) {
		tableString += "<tr>";
		for (var j = 0; j < properties.length; j++) {
			tableString += "<td>" + getPropertyValue(events[i], properties[j]) + "</td>";
		}
		tableString += "</tr>";
	}
	tableString += "</table>";
	
	return tableString;
}

function getPropertyValue(event, property) {
	var propertyNameChain = property.field.split('.');
	var propertyValue = event[propertyNameChain[0]];
	for (var i = 1; i < propertyNameChain.length; i++) {
		propertyValue = propertyValue[propertyNameChain[i]];
	}
	
	if (property.processor) {
		return property.processor(propertyValue);
	} else {
		return propertyValue;
	}
}

function sendPredictionEmail(user) {
	
	var startDate = getStartOfDayWithOffsetFromToday(1);
	var endDate = getStartOfDayWithOffsetFromToday(2);
	
	getPredictionData(startDate, endDate, user, function(err, calendarResponseData) {
		var calendarEvents = calendarResponseData;
		var emailContent = "<p>Summary of your meetings on " + startDate.toDateString() + "</p>";
		emailContent += "<table><tr><td>Start</td><td>Subject</td><td>Organizer</td><td>Location</td><td>Body Preview</td><td>Predicted Heart Rate</td></tr>";
		for (var i = 0; i < calendarEvents.length; i++) {
			var event = calendarEvents[i];
			var startTime = new Date(event.Start);
			
			emailContent += "<tr><td>" + createFriendlyTimeString(startTime)
			emailContent += "</td><td>" + event.Subject;
			emailContent += "</td><td>" + event.Organizer.EmailAddress.Name;
			emailContent += "</td><td>" + event.Location.DisplayName;
			emailContent += "</td><td>" + event.BodyPreview;
			emailContent += "</td><td>" + event.PredictedHeartRate;
			emailContent += "</td></tr>";  
		}
		emailContent += "</table>";
		
		var emailMessage = {
			Message: {
				Subject: 'HR Predictor - ' + startDate.toDateString(),
				Body: {
					ContentType: 'HTML',
					Content: emailContent
				},
				ToRecipients: [
					{ EmailAddress: { Address: user.aadTokens.idToken.unique_name } }
				],
			},
			SaveToSentItems: false
		};

		request({
		    url: "https://" + calendarHostName + "/api/v1.0/me/sendMail",
			method: "POST",
			headers: {
				'Authorization': 'Bearer ' + user.aadTokens.accessToken
			},
			port: 443,
		    json: true,
		    body: emailMessage
		}, function (error, response, body){
			if (error) console.log(error);
		});		
	});
}

function getPredictionData(startDate, endDate, user, callback) {
	
	getCalendarData(startDate, endDate, user, function(err, calendarResponseData) {
		var calendarEvents = JSON.parse(calendarResponseData).value;
		getPredictedHeartRates(calendarEvents, function(err, message) {
			callback(null, calendarEvents);
		});
	});
}

function overlap(startDateOne, endDateOne, startDateTwo, endDateTwo) {
	startDateOne = startDateOne.replace('.000+00:00','Z');
	endDateOne = endDateOne.replace('.000+00:00','Z');
	startDateTwo = startDateTwo.replace('.000+00:00','Z');
	endDateTwo = endDateTwo.replace('.000+00:00','Z');
	if (startDateOne >= startDateTwo && startDateOne < endDateTwo) return true;
	if (endDateOne <= endDateTwo && endDateOne > startDateTwo) return true;
	if (startDateOne <= startDateTwo && endDateOne >= endDateTwo) return true;
	return false;
}