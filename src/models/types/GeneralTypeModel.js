(function (window, console, Encryptr, undefined) {
  "use strict";
  console       = console || {};
  console.log   = console.log || function() {};
  var Backbone  = window.Backbone,
    _         = window._,
    $         = window.Zepto;

  var GeneralType = function() {
    this.type = "General";
    this.items = [
      { id: "text", key: "Text", value: "", placeholder: "Text here" }
    ];
  };

  GeneralType.prototype.displayName = "General";
  GeneralType.prototype.icon = "fa-lock";

  Encryptr.prototype.types = Encryptr.prototype.types || {};
  Encryptr.prototype.types.GeneralType = GeneralType;

})(this, this.console, this.Encryptr);
