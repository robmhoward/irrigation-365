module.exports = {
	getCurrentUser: getCurrentUser,
	updateUser: updateUser
};



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

//Assumption is that userId is the AAD GUID 
function getUserFromDataStore(request, userId, callback) {
		request.db.query('SELECT * from user WHERE aadId='+mysql.escape(userId)+ ' limit 1', function(err,rows){
		if(err) {
				console.error('error:' + err.stack);
				callback(err);
		}
		callback(null,rows);
	});
}

function updateUserInDataSource(request, userId, callback) {
	//need to determine where we are getting the update from
	
}