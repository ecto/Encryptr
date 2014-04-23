var Encryptr = (function (window, console, undefined) {
  "use strict";
  console       = console || {};
  console.log   = console.log || function() {};
  var Backbone  = window.Backbone,
      _         = window._,
      $         = window.Zepto;

  var Encryptr = function () {
    this.online = true; // assume a hopeful default
  };

  Encryptr.prototype.init = function() {
    window.document.addEventListener("deviceready", this.onDeviceReady, false);
    window.document.addEventListener("resume", this.onResume, false);
    window.document.addEventListener("pause", this.onPause, false);
    window.document.addEventListener("offline", this.setOffline, false);
    window.document.addEventListener("online", this.setOnline, false);

    var settings = window.localStorage.getItem("settings") || "{}";
    window.app.settings = JSON.parse(settings);

    // Set the hostname for the Crypton server
    // XXX ecto: temporarily pointing to a single server
    // because the load balancer isn't playing nicely with
    // either cookies or web sockets. this works for now
    window.crypton.host = "54.85.102.109";
    window.crypton.port = 1025;

    window.Offline.options = {
      // Should we check the connection status immediatly on page load.
      checkOnLoad: false,

      // Should we monitor AJAX requests to help decide if we have a connection.
      interceptRequests: true,

      // Should we automatically retest periodically when the connection is
      // down (set to false to disable).
      reconnect: {
        // How many seconds should we wait before rechecking.
        initialDelay: 3
      },

      // Should we store and attempt to remake requests which fail while the
      // connection is down.
      requests: true,

      // Should we show a snake game while the connection is down to keep
      // the user entertained?
      // It's not included in the normal build, you should bring in
      // js/snake.js in addition to offline.min.js.
      game: false,

      // What the xhr checks
      // XXX ecto: this route should always return 200
      // right now (it really shouldn't if foo doesn't exist)
      // [https://github.com/SpiderOak/crypton/issues/72]
      // whereas / currently always returns a 404 without
      // appPath set in the crypton config (which it isn't in prod)
      checks: {
        xhr: {
          url: "https://" + window.crypton.host + "/peer/foo"
        }
      }
    };

    var isNodeWebkit = (typeof process == "object");
    if (isNodeWebkit) $.os.nodeWebkit = true;
    // Render the login view (and bind its events)
    this.loginView = new this.LoginView().render();
    // Hax for Android 2.x not groking :active
    $(document).on("touchstart", "a", function(event) {
      var $this = $(this);
      $this.addClass("active");
    });
    $(document).on("touchend", "a", function(event) {
      var $this = $(this);
      $this.removeClass("active");
    });
    $(document).on("touchmove", "a", function(event) {
      var $this = $(this);
      $this.removeClass("active");
    });

    this.dialogConfirmView = new Encryptr.prototype.DialogConfirmView().render();
    this.dialogConfirmView.dismiss();
    $("#main").append(this.dialogConfirmView.el);
    this.dialogAlertView = new Encryptr.prototype.DialogAlertView().render();
    this.dialogAlertView.dismiss();
    $("#main").append(this.dialogAlertView.el);

    window.FastClick.attach(document.body);
  };

  Encryptr.prototype.onDeviceReady = function(event) {
    if (window.device && window.device.platform === "iOS" &&
        parseFloat(window.device.version) >= 7.0) {
      // status bar hax
      window.document.querySelectorAll(".app")[0].style.top = "20px";
    }
    if (window.StatusBar && $.os.ios) {
      window.StatusBar.styleLightContent();
    }
    // Backstack effects
    Encryptr.prototype.noEffect = new window.BackStack.NoEffect();
    Encryptr.prototype.fadeEffect = new window.BackStack.FadeEffect();
    Encryptr.prototype.defaultEffect = new Encryptr.prototype.FastSlideEffect();
    Encryptr.prototype.defaultPopEffect = new Encryptr.prototype.FastSlideEffect({
      direction: "right"
    });
    window.document.addEventListener("backbutton",
                                     Encryptr.prototype.onBackButton, false);
    window.document.addEventListener("menubutton",
                                     Encryptr.prototype.onMenuButton, false);

    // Platform specific clipboard plugin / code
    if ($.os.ios || $.os.android) {
      Encryptr.prototype.copyToClipboard = window.cordova.plugins.clipboard.copy;
    } else if ($.os.bb10) {
      Encryptr.prototype.copyToClipboard = window.community.clipboard.setText;
    // How to *actually* detect node-webkit ?
    } else if ($.os.nodeWebkit && window.require ) {
      var gui = window.require('nw.gui');
      window.clipboard = gui.Clipboard.get();
      Encryptr.prototype.copyToClipboard = function(text) {
        window.clipboard.set(text, 'text');
      };
    } else {
      // Fallback to empty browser polyfill
      Encryptr.prototype.copyToClipboard = function() {};
    }
  };

  Encryptr.prototype.setOffline = function(event) {
    this.online = false;
  };

  Encryptr.prototype.setOnline = function(event) {
    this.online = true;
  };

  Encryptr.prototype.onResume = function(event) {
    // Throw up the login screen
    window.app.loginView.show();
    window.setTimeout(function() {
      window.app.session = undefined;
      window.app.navigator.popAll(window.app.noEffect);
      window.app.mainView.menuView.close();
    },100);
  };

  Encryptr.prototype.onPause = function(event) {
    // ...
  };

  Encryptr.prototype.onBackButton = function(event) {
    if ($(".dialogAlert").is(":visible")) {
      window.app.dialogAlertView.dismiss();
      return;
    }
    if ($(".dialogConfirm").is(":visible")) {
      window.app.dialogConfirmView.dismiss();
      return;
    }
    if ($(".menu").is(":visible")) {
      window.app.mainView.menuView.dismiss();
      return;
    }
    if ($(".addMenu").is(":visible")) {
      window.app.mainView.addMenuView.dismiss();
      return;
    }
    if ($(".back-btn").is(":visible")) {
      window.app.navigator.popView(window.app.defaultPopEffect);
      return;
    }
    navigator.app.exitApp();
  };

  Encryptr.prototype.onMenuButton = function(event) {
    // ...
  };

  Encryptr.prototype.randomString = function(length) {
    var charset = "!@#$%^*()_+{}:?|,[];./~ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
      "abcdefghijklmnopqrstuvwxyz0123456789";
    var i;
    var result = "";
    if(window.crypto && window.crypto.getRandomValues) {
      var values = new Uint32Array(length);
      window.crypto.getRandomValues(values);
      for(i = 0; i < length; i++) {
          result += charset[values[i] % charset.length];
      }
    }
    return result; // If you can't say something nice, don's say anything at all
  };

  return Encryptr;

})(this, this.console);
