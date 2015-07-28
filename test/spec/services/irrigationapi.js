'use strict';

describe('Service: irrigationApi', function () {

  // load the service's module
  beforeEach(module('irrigation365App'));

  // instantiate service
  var irrigationApi;
  beforeEach(inject(function (_irrigationApi_) {
    irrigationApi = _irrigationApi_;
  }));

  it('should do something', function () {
    expect(!!irrigationApi).toBe(true);
  });

});
