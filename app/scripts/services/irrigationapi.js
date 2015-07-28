'use strict';

/**
 * @ngdoc service
 * @name irrigation365App.irrigationApi
 * @description
 * # irrigationApi
 * Factory in the irrigation365App.
 */
angular.module('irrigation365App')
  .factory('irrigationApi', ['$http', function ($http) {

    // Public API here
    return {
      getWateringAppointments: function (startDate, endDate) {
        return $http.get("/api/wateringAppointments?startDate=" + startDate.toISOString() + "&endDate=" + endDate.toISOString());
      },
      getCurrentUser: function () {
        return $http.get("/api/me");
      }
    };
  }]);
