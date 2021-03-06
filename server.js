var fallbackPort = 9000;
var port = process.env.PORT || fallbackPort;
var express = require('express');
var https = require('https');
var bodyParser = require('body-parser');
var decodejwt = require('./decodejwt.js');
var getAccessToken = require('./getAccessToken.js');
var getServiceData = require('./getServiceData.js');
var userProfile = require('./userProfile.js');
var cookieParser = require('cookie-parser');
var app = express();

//db connection to mysql
var mysql = require('mysql2');
var db = mysql.createConnection({host:'localhost',user:'i365', password:'McGZU27LfL7JMj3x',database:'irrigation365'});
db.connect(function(err) {if(err) {console.error('error connecting' + err.stack);return;}});

app.use('/', express.static(__dirname + "/app"));
app.use('/bower_components', express.static(__dirname + "/bower_components"));
app.use(cookieParser());
app.use(bodyParser.json()); // for parsing application/json
app.use(function(req,res,next){
    req.db = db;
    next();
});
// setInterval(sendDigestEmails, 1000 * 5);//60 * 60 * 24);

app.get('/api/me', function(request, response) {
	//this db request will just spit out all the db entries
	request.db.query('SELECT * FROM user', function(err,rows) {
			if(err) {
				console.error('error connecting' + err.stack);
				return;
			}
			response.send(rows);
			response.end();
		});
	
	var me = {
		name: "Test User",
		email: "rob@howard.cc",
		sendEmailSummaries: true,
		minimumMoistureReading: 75,
		onlyWaterWhenItsDry: true,
		skipWateringWhenItRains: true,
		currentTime: new Date()
	};
	
	// userProfile.getCurrentUser(request, function(err, user) {
	// 	if (user) {
	// 		me = user;
	// 		me.addUser = me.aadTokens.idToken;
	// 		delete me.aadTokens;
	// 		delete me.msaTokens;
	// 	}
	//	response.send(me);
	//	response.end();
	// });
});

app.patch('/api/me', function(request, response) {
	if (request.body) {
		var updateDocument = {};
		var validProperties = ["firstName", "lastName", "email", "sendPredictionEmails", "sendSummaryEmails"];
		var updatedProperties = 0;
		for (var i = 0; i < validProperties.length; i++) {
			var postedProperty = request.body[validProperties[i]];
			if (postedProperty || postedProperty === false) {
				updatedProperties++;
				updateDocument[validProperties[i]] = postedProperty;
			}
		}
		if (updatedProperties > 0) {
			userProfile.updateUser(request, updateDocument, function(err, result) {
				if (err) {
					response.writeHead(500);
					response.end();
					console.log("Failed to update user");
				} else {
					response.writeHead(202);
					response.end();
					console.log("Successfully updated user");
				}
			});
		} else {
			response.writeHead(400);
			response.write("No valid properties to update");
			response.end();
		}
	} else {
		response.writeHead(400);
		response.write("Request is missing user or body");
		response.end();
	}	
});


app.get('/api/me/historicalData', function(request, response) {
	handleHistoricalDataRequest(request, response, false);
});

function handleHistoricalDataRequest(request, response, convertToCsv) {
		
	if (request.query.start && request.query.end) {
		
		var startDate = new Date(request.query.start);
		var endDate = new Date(request.query.end);
		
		userProfile.getCurrentUser(request, function(err, user) {	
			if (user) {
				getServiceData.getHistoricalData(startDate, endDate, user, function(err, historicalData) {
					if (err) {
						response.writeHead(400);
						response.write("No user tokens");		
						response.end();
					} else {
						if (convertToCsv) {
							for (var i = 0; i < historicalData.length; i++) {
								historicalData[i].Body = historicalData[i].Body.Content;
								historicalData[i].Location = historicalData[i].Location.DisplayName;
								historicalData[i].Organizer = historicalData[i].Organizer.EmailAddress.Address;
								historicalData[i].ResponseStatus = historicalData[i].ResponseStatus.Response;
								var attendees = "";
								for (var j = 0; j < historicalData[i].Attendees.length; j++) {
									attendees += historicalData[i].Attendees[j].EmailAddress.Address + ';';
								}
								historicalData[i].Attendees = attendees;
							}
							
							response.writeHead(200, {"Content-Type": "text/csv"});
							response.write(jsonToCsv.createCsvString(historicalData));
							response.end();
						} else {
							response.send(historicalData);
							response.end();
						}
					}
				});
			} else {
				response.writeHead(400);
				response.write("No current user");		
				response.end();
			}
		});
	} else {
		response.writeHead(400);
		response.write("You have to specify 'start' and 'end' querystring params in ISO8601 format");		
		response.end();
	}
}

function catchCode(request, response, authConfig, scopes, resource) {
	
	var protocol = port == fallbackPort ? "http" : "https";
	
	var redirectUrl = protocol + '://' + request.get('host') + request.path;
	if (!request.query.code) {
		response.writeHead(302, {"Location": getAccessToken.getAuthorizationEndpointUrl(authConfig, redirectUrl, scopes, resource)});
		response.end();
	} else {
		
		var cookieUserId = request.cookies.userId;

		function updateUserInfo(userId, documentObject) {
			userProfile.updateUser(request, {}, function(error, results) {
				setCookieRedirectAndEndRequest(userId);
			});
		}
	
		function setCookieRedirectAndEndRequest(newUserIdCookieValue) {
			if (newUserIdCookieValue) {
				console.log("Setting cookie to: " + newUserIdCookieValue);
				response.cookie('userId', newUserIdCookieValue, { maxAge: 900000, httpOnly: true });
			}
			response.writeHead(302, {"Location": request.protocol + '://' + request.get('host') + '/#/home'});
			response.end();
		}
		
		getAccessToken.getTokenResponseWithCode(authConfig, request.query.code, redirectUrl, function(error, tokenResponseData) {
			if (error) {
				console.log("Error getting token response");
				response.writeHead(200, {"Content-Type": "text/plain"});
				response.write("Error: " + error);
				response.end();
			} else {
				console.log(tokenResponseData);
				var tokenResponse = JSON.parse(tokenResponseData);
				
				if (cookieUserId) {
					console.log("Found user id cookie");
					//replace the current user's aad user info with what we get back from catchcode
					updateUserInfo(cookieUserId, tokenResponse);
					setCookieRedirectAndEndRequest();
				} else {
					console.log("No user id cookie found");
					//try to find a current user with this id
					
					var idToken = decodejwt.decodeJwt(tokenResponse.id_token).payload;
		
					userProfile.lookupUser(request, idToken.oid, function(error, result) {
						if (result === undefined) {
							userProfile.insertUser(
								request,
								{
									aadId: idToken.oid,
									firstName: idToken.given_name,
									lastName: idToken.family_name,
									emailAddress: idToken.upn
								},
								function (error, results) {
									setCookieRedirectAndEndRequest(idToken.oid);
								});
						} else {
							updateUserInfo(idToken.oid, tokenResponse);
						}
					});
				}
			}
		});
	}
}

app.get('/catchCode', function(request, response) {
	catchCode(request, response, "AAD", null, "https://outlook.office365.com");
});

console.log("Starting server on port " + port + "...");
app.listen(port);