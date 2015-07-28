'use strict';

/**
 * @ngdoc function
 * @name irrigation365App.controller:HomeCtrl
 * @description
 * # HomeCtrl
 * Controller of the irrigation365App
 */
angular.module('irrigation365App')
  .controller('HomeCtrl', function ($scope, irrigationApi) {
    $scope.user = {name: "Loading..."};
    
    irrigationApi.getCurrentUser().then(function(response) {
      $scope.user = response.data;
    });
  });
