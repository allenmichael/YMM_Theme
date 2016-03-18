define(['modules/jquery-mozu', 'widgets/ymm'],
  function($, YmmHandler) {
    $(document).ready(function() {

      YmmHandler.init();
      YmmHandler.bindEventListeners();

    });
  });