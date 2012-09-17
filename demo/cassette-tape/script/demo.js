/**
 * Cassette Demo page JS - you don't need this part.
 */

(function() {

function init() {

  // Demo-specific things: background-switching, etc.

  var bgIndex = 1,
      backgrounds;

  // note: remote servers will need to serve a CORS response header for cross-domain canvas access.
  backgrounds = [
   'image/demo_backgrounds/sfatnight_1600.jpg',
   'http://freshly-ground.com/data/image/sm2/lake_1600.jpg',
   'http://freshly-ground.com/data/image/sm2/wall_of_hard_drives.jpg',
   'http://freshly-ground.com/data/image/sm2/attack_of_the_jellyfish.jpg',
   'http://freshly-ground.com/data/image/sm2/cassette_tape_lamp.jpg'
  ];

  document.getElementById('nextBackground').onclick = function(e) {

    var i, j, refreshed,
        loader = document.getElementById('tape-loader');

    function refreshDone() {
      // re-hide the loader
      refreshed++;
      if (refreshed == tapeUIs.length) {
        if (loader) {
          loader.className = 'hidden';
        }
      }
    }

    // hack: make the loader visible again
    if (loader) {
      loader.className = 'visible';
    }

    document.getElementsByTagName('html')[0].style.backgroundImage = 'url(' + backgrounds[bgIndex] + ')';

    refreshed = 0;

    for (i=0, j=tapeUIs.length; i<j; i++) {
      tapeUIs[i].refreshBlurImage(refreshDone);
    }

    if (++bgIndex >= backgrounds.length) {
      bgIndex = 0;
    }

    e.preventDefault();
    return false;

  }

  // form helpers

  var form = document.getElementById('tape-form'),
      defaultValue,
      input;

  if (form) {

    input = form.getElementsByTagName('input')[0];

    function submitHandler(e) {

      var inputURL = input.value,
          s = soundManager.getSoundById('tapeSound'),
          lastValue,
          caughtSubmit;

      // URL should at least have two slashes in it, to be considered valid.
      if (s && inputURL.match(/\/\//) && s.url !== inputURL) {

        s.load({
          url: inputURL
        }).play();

      }

      if (e) {
        e.preventDefault();
      }

      // is the form focused? blur if so.
      if (document.activeElement && document.activeElement == input) {
        try {
          caughtSubmit = true;
          input.blur();
        } catch(ee) {
          // oh well
        }
      }

      return false;

    }

    form.onsubmit = submitHandler;

    // reset form on load
    defaultValue = input.getAttribute('data-default-value');

    input.value = defaultValue;

    input.onfocus = function() {

      caughtSubmit = false;

      lastValue = this.value;

      this.value = '';

    }

    input.onblur = function() {

      if (!this.value) {

        this.value = (lastValue || defaultValue);

      }

      if (!caughtSubmit) {
        // user tabbed out, etc.? we may load a new URL now.
        submitHandler();
      }

    }

  }

}

soundManager.setup({
  onready: init,
  ontimeout: init
});

}());
