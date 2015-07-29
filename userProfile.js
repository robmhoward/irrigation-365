module.exports = {
	getCurrentUser: getCurrentUser,
	updateUser: updateUser
};

var mysql = require('mysql2');
var dbconnection = mysql.createConnection(user:'i365', database:'McGZU27LfL7JMj3x');


function getUserIdFromRequest(request) {
	return request.cookies.userId;
}

function updateUser(request, properties, callback) {
	var userId = getUserIdFromRequest(request);
	
	if (userId) {
		console.log("current user id found");
		updateUserInDataSource(request, userId, callback);
	} else {
		callback(null, null);
	}
}

function getCurrentUser(request, callback) {
	var userId = getUserIdFromRequest(request);
	
	if (userId) {
		console.log("current user id found");
		getUserFromDataStore(request, userId, callback);
	} else {
		callback(null, null);
	}
}

function getUserFromDataStore(request, userId, callback) {
	var db = request.db;
	var userCollection = db.get('usercollection');
	
	userCollection.findById(userId)
		.success(function (user) {
			console.log("current user found in db");
			callback(null, user);
		})
		.error(function (err) {
			console.log("Error finding current user");	
			callback(err);
		});
}

function updateUserInDataSource(request, userId, callback) {
	
}