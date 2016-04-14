define(['modules/jquery-mozu', 'underscore', 'modules/api', 'hyprlive'],
  function($, _, api, Hypr) {

    var YmmHandler = function() {
      this.years = [];

      this.makes = [];

      this.models = [];

      this.selectedYear = '';
      this.selectedMake = '';
      this.selectedModel = '';
      this.sessionStorageKeyYear = "selectedYear";
      this.sessionStorageKeyMake = "selectedMake";
      this.sessionStorageKeyModel = "selectedModel";
      this.sessionStorageKeyYearArray = "years";
      this.sessionStorageKeyMakesArray = "makes";
      this.sessionStorageKeyModelsArray = "models";

      this.baseUrl = window.location.href;
      this.attribute = Hypr.getThemeSetting("ymmAttributeFQN");
      this.facet = "facetValueFilter";
      this.facetTemplate = this.facet + '=' + this.attribute + ':';
      this.regexExistingQueryParams = new RegExp(/\?(.+=.+&?)+/);
      this.regexRemoveYmmFilter = new RegExp("(" + this.facetTemplate + ".+&?)+", 'g');
    };

    YmmHandler.prototype.initCheckSessionStorageForYears = function() {
      if (sessionStorage.getItem(this.sessionStorageKeyYearArray)) {
        var yearString = sessionStorage.getItem(this.sessionStorageKeyYearArray);
        this.years = yearString.split(',');
      } else {
        this.selectedYear = '';
        this.selectedMake = '';
        this.selectedModel = '';
        sessionStorage.removeItem(this.sessionStorageKeyYear);
        sessionStorage.removeItem(this.sessionStorageKeyMake);
        sessionStorage.removeItem(this.sessionStorageKeyModel);
      }
    };

    YmmHandler.prototype.initCheckSessionStorageForMakes = function() {
      if (sessionStorage.getItem(this.sessionStorageKeyMakesArray)) {
        var makesString = sessionStorage.getItem(this.sessionStorageKeyMakesArray);
        this.makes = makesString.split(',');
      } else {
        this.selectedYear = '';
        this.selectedMake = '';
        this.selectedModel = '';
        sessionStorage.removeItem(this.sessionStorageKeyYear);
        sessionStorage.removeItem(this.sessionStorageKeyMake);
        sessionStorage.removeItem(this.sessionStorageKeyModel);
      }
    };

    YmmHandler.prototype.initCheckSessionStorageForModels = function() {
      if (sessionStorage.getItem(this.sessionStorageKeyModelsArray)) {
        var modelString = sessionStorage.getItem(this.sessionStorageKeyModelsArray);
        this.models = modelString.split(',');
      } else {
        this.selectedMake = '';
        this.selectedModel = '';
        sessionStorage.removeItem(this.sessionStorageKeyMake);
        sessionStorage.removeItem(this.sessionStorageKeyModel);
      }
    };

    YmmHandler.prototype.initCheckSessionStorageForFullYmm = function() {
      if (sessionStorage.getItem(this.sessionStorageKeyYear)) {
        this.selectedYear = sessionStorage.getItem(this.sessionStorageKeyYear);
        if (sessionStorage.getItem(this.sessionStorageKeyMake)) {
          this.selectedMake = sessionStorage.getItem(this.sessionStorageKeyMake);
        }
        if (sessionStorage.getItem(this.sessionStorageKeyModel)) {
          this.selectedModel = sessionStorage.getItem(this.sessionStorageKeyModel);
        }
      }
    };

    YmmHandler.prototype.init = function() {
      console.log("Firing init...");
      console.log(Hypr.getThemeSetting("ymmYearDb"));
      console.log(Hypr.getThemeSetting("ymmYearDbId"));
      console.log(Hypr.getThemeSetting("ymmYearMakeDb"));
      var me = this;

      this.initCheckSessionStorageForYears();
      this.initCheckSessionStorageForMakes();
      this.initCheckSessionStorageForModels();
      this.initCheckSessionStorageForFullYmm();

      if (this.selectedYear !== '') {
        this.populateYears();
        $('#year').val(this.selectedYear);
        this.populateMakes();
        $('#make').prop("disabled", false);
        if (this.selectedMake !== '') {
          $('#make').val(this.selectedMake);
          this.populateModels();
          $('#model').prop("disabled", false);
          if (this.selectedModel !== '') {
            $('#model').val(this.selectedModel);
            $('#filterYmm').prop('disabled', false);
          }
        }
      } else if (this.years.length > 0) {
        this.populateYears();
      } else {
        this.queryDBForYears()
          .then(function(result) {
            sessionStorage.setItem(me.sessionStorageKeyYearArray, result.data.years);
            me.years = result.data.years;
            me.populateYears();
          });
      }
    };



    YmmHandler.prototype.bindEventListeners = function() {
      var me = this;
      $('#year').change(function() {
        me.selectedYear = $('#year').find('option:selected').text();
        sessionStorage.setItem(me.sessionStorageKeyYear, me.selectedYear);
        me.resetOnYearChange();
        me.queryDBForMakes()
          .then(function(result) {
            sessionStorage.setItem(me.sessionStorageKeyMakesArray, result.data.makes);
            me.makes = result.data.makes;
            me.populateMakes();
          });
      });

      $('#make').change(function() {
        me.selectedMake = $('#make').find('option:selected').text();
        sessionStorage.setItem(me.sessionStorageKeyMake, me.selectedMake);
        me.resetOnMakeChange();
        me.queryDBForModels(me.formatYearMakeForModelLookup(me.selectedYear, me.selectedMake))
          .then(function(result) {
            sessionStorage.setItem(me.sessionStorageKeyModelsArray, result.data.models);
            me.models = result.data.models;
            me.populateModels();
          });
      });

      $('#model').change(function() {
        me.selectedModel = $('#model').find('option:selected').text();
        sessionStorage.setItem(me.sessionStorageKeyModel, me.selectedModel);
        if (me.selectedModel) {
          $('#filterYmm').prop('disabled', false);
        }
      });

      $('#filterYmm').click(function(e) {
        e.preventDefault();
        me.baseUrl = window.location.href;
        sessionStorage.setItem(me.sessionStorageKeyYear, me.selectedYear);
        sessionStorage.setItem(me.sessionStorageKeyMake, me.selectedMake);
        sessionStorage.setItem(me.sessionStorageKeyModel, me.selectedModel);
        me.generateRedirectUrl(me.selectedYear, me.selectedMake, me.selectedModel);
      });
    };

    YmmHandler.prototype.resetOnYearChange = function() {
      this.makes = [];
      $('#make').empty();
      $('#model').empty();
      $('#make').prop("disabled", false);
      $('#model').prop("disabled", true);
      $('#filterYmm').prop("disabled", true);

      sessionStorage.removeItem(this.sessionStorageKeyMake);
      sessionStorage.removeItem(this.sessionStorageKeyModel);
      sessionStorage.removeItem(this.sessionStorageKeyMakesArray);
      sessionStorage.removeItem(this.sessionStorageKeyModelsArray);
    };

    YmmHandler.prototype.resetOnMakeChange = function() {
      this.models = [];
      $('#model').empty();
      $('#model').prop("disabled", false);
      $('#filterYmm').prop("disabled", false);

      sessionStorage.removeItem(this.sessionStorageKeyModel);
      sessionStorage.removeItem(this.sessionStorageKeyModelsArray);
    };

    YmmHandler.prototype.queryDBForYears = function() {
      return api.get('entity', { "listName": Hypr.getThemeSetting("ymmYearDb"), "id": Hypr.getThemeSetting("ymmYearDbId") });
    };

    YmmHandler.prototype.queryDBForMakes = function() {
      return api.get('entity', { "listName": Hypr.getThemeSetting("ymmYearMakeDb"), "id": this.selectedYear });
    };

    YmmHandler.prototype.queryDBForModels = function(yearMake) {
      return api.get('entity', { "listName": Hypr.getThemeSetting("ymmYearMakeModelDb"), "id": yearMake });
    };

    YmmHandler.prototype.formatYearMakeForModelLookup = function(year, make) {
      return year + ' ' + make;
    };

    YmmHandler.prototype.populateYears = function() {
      $('#year').append('<option disabled selected> -- Select a Year -- </option>');
      _.each(this.years, function(year) {
        $('#year').append('<option value=' + year + '>' + year + '</option>');
      });
    };

    YmmHandler.prototype.populateMakes = function() {
      if (this.makes && this.makes.length > 0) {
        $('#make').append('<option disabled selected> -- Select a Make -- </option>');
        _.each(this.makes, function(make) {
          $('#make').append('<option value=' + make + '>' + make + '</option>');
        });
      } else {
        $('#make').append('<option disabled selected>No Makes Found for This Year</option>');
        $('#make').prop("disabled", true);
        $('#model').prop("disabled", true);
        $('#filterYmm').prop("disabled", true);
      }
    };

    YmmHandler.prototype.populateModels = function() {
      if (this.models && this.models.length >= 1) {
        $('#model').append('<option disabled selected> -- Select a Model -- </option>');
        _.each(this.models, function(model) {
          $('#model').append('<option value=' + model + '>' + model + '</option>');
        });
        $('#filterYmm').prop("disabled", true);
      } else {
        $('#model').append('<option disabled selected>No Models Found for This Year and Make</option>');
        $('#model').prop("disabled", true);
        $('#filterYmm').prop("disabled", true);
      }
    };

    YmmHandler.prototype.generateRedirectUrl = function(selectedYear, selectedMake, selectedModel) {
      var hasExistingQueryParams = (this.baseUrl.match(this.regexExistingQueryParams) !== null) ? true : false;
      var endsWithAmpersand = (this.baseUrl[this.baseUrl.length - 1] === '&') ? true : false;
      var hasYmmFilter = (this.baseUrl.match(this.regexRemoveYmmFilter) !== null) ? true : false;
      var facetValue = selectedYear + '-' + selectedMake + '-' + selectedModel;
      var redirectUrl;
      var alteredUrl;

      if (hasYmmFilter) {
        try {
          var temporaryUrl = decodeURIComponent(this.baseUrl);
          var queryString = temporaryUrl.split('?');
          queryString = queryString[1];
          var params = queryString.split('=');
          var facetValues = params[params.indexOf('facetValueFilter') + 1];
          facetValues = facetValues.split(',');
          var ymm = facetValues.filter(function(value) { return (value.indexOf("Tenant~year-make-model") >= 0) ? true : false; });
          if (ymm) {
            ymm = ymm[0];
            var urlString1 = temporaryUrl.substring(0, temporaryUrl.indexOf(ymm));
            var urlString2 = temporaryUrl.substring(temporaryUrl.indexOf(ymm) + ymm.length);
            if (urlString2[0] === ',') {
              urlString2 = urlString2.substring(1);
            }
            if (urlString2[urlString2.length - 1] === '&') {
              urlString2 = urlString2.substring(0, urlString2.length - 1);
            }
            redirectUrl = urlString1 + urlString2;
            redirectUrl = redirectUrl + ',' + this.attribute + ':' + facetValue;
            window.location.href = redirectUrl;
          }
        } catch (err) {
          console.log(err);
          window.location.href = this.baseUrl;
        }
      } else {

        if (hasExistingQueryParams) {
          if (endsWithAmpersand) {
            redirectUrl = this.baseUrl + this.facetTemplate + facetValue;
          } else {
            redirectUrl = this.baseUrl + '&' + this.facetTemplate + facetValue;
          }
        } else {
          if (this.baseUrl.indexOf('?') > 0) {
            alteredUrl = this.baseUrl.slice(0, this.baseUrl.indexOf('?'));
            redirectUrl = alteredUrl + '?' + this.facetTemplate + facetValue + '&';
          } else {
            redirectUrl = this.baseUrl + '?' + this.facetTemplate + facetValue + '&';
          }
        }
        window.location.href = redirectUrl;
      }
    };

    return new YmmHandler();

  });