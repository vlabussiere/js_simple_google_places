/*!
  Simple Google Places 1.0.0
*/
(function($) {
    $.simpleGooglePlaces = function(element, options) {
        var defaults = {
          'endpoint':'./example/data.json',
          'place_type':'Store',
          'render':'is_open',
          'close_in':60,
          'open_in':60,
          'class':{
            'place':'sgp-place',
            'time':'sgp-time',
            'day':'sgp-day'
          },
          'strings':{
            'open':{
              'label':'<span class="@class_place">@place</span> will open at <span class="@class_time">@time</span> on <span class="@class_day">@day</span>.',
              'label_this_day':'<span class="@class_place">@place</span> will open at <span class="@class_time">@time</span>.',
              'time':'@h:@m',
            },
            'close':{
              'label':'<span class="@class_place">@place</span> will close at <span class="@class_time">@time</span>.',
              'label_in':'<span class="@class_place">@place</span> will close in <span class="@class_time">@time</span> minutes.',
              'label_other_day':'<span class="@class_place">@place</span> will close at <span class="@class_time">@time</span> on <span class="@class_day">@day</span>.',
            },
          }
        };
        var plugin = this;
        plugin.settings = {}

        var $element = $(element);
        var _hours = {
          'is_open':false,
          'close':{
            'day':null,
            'time':null
          },
          'open':{
            'day':null,
            'time':null
          }
        }
        
        var weekday = new Array(7);
        weekday[0] = "sunday";
        weekday[1] = "monday";
        weekday[2] = "tuesday";
        weekday[3] = "wednesday";
        weekday[4] = "thursday";
        weekday[5] = "friday";
        weekday[6] = "saturday";

        var currentTime = new Date();
        var currentDay = currentTime.getDay();
        var currentHours = ("0" + currentTime.getHours()).slice(-2) + ("0" + currentTime.getMinutes()).slice(-2);

        plugin.init = function() {
          plugin.settings = $.extend({}, defaults, options);
          plugin.settings.schema = $.extend({}, defaults.schema, options.schema);
          // Load json data.
          //var jqxhr = $.getJSON(plugin.settings.endpoint, function(data) {
          var jqxhr = $.getJSON('./sites/all/libraries/simple_google_places/example/data.json', function(data) {
            if (plugin.settings.render == 'is_open') {
              is_open(data);
            }
          });
        }
        /**
         * Display next close or next open hours.
         */
        var is_open = function(data) {
          if ('result' in data) {
            if ('opening_hours' in data.result) {
              if ('periods' in data.result.opening_hours) {
               
                for (var i in data.result.opening_hours.periods) {
                  if (data.result.opening_hours.periods[i].open.day <= currentDay) {
                    if (
                      (      
                        data.result.opening_hours.periods[i].close.day == currentDay
                        &&
                        data.result.opening_hours.periods[i].close.time >= currentHours
                      )
                      ||
                      (
                        data.result.opening_hours.periods[i].close.day != currentDay
                      )
                    ) {
                      _hours.is_open = true;
                      _hours.close = data.result.opening_hours.periods[i].close;
                      $element.attr('data-close', _hours.close.time);
                      $element.attr('data-close-day', _hours.close.day);
                    }
                  }
                  // Prochaine ouverture
                  if (data.result.opening_hours.periods[i].open.day > currentDay
                    &&
                    _hours.open.day == null
                  ) {
                    _hours.open = data.result.opening_hours.periods[i].open;
                  }
                }
                // Si la date de la prochaine ouverture n'est pas définie, on
                // repart sur la première valeur.
                if (_hours.open.day == null) {
                  _hours.open = data.result.opening_hours.periods[0].open;
                }
                if (_hours.close.day == null) {
                  _hours.close = data.result.opening_hours.periods[0].close ;
                }
              }
              
              var html = '';
              
              if (_hours.is_open) {
                var _diff = diff(_hours.close.time, currentHours, _hours.close.day, currentDay);
                if (_diff < plugin.settings.close_in) {
                  html = close_in(_diff);
                }
                else {
                  html = close_at(_hours.close.day, _hours.close.time);
                }
              }
              else if (!_hours.is_open) {
                var string = plugin.settings.strings.open.label;
                if (_hours.open.day == currentDay) {
                  string = plugin.settings.strings.open.label_this_day;
                }
                html = Drupal.t(string,
                  {
                    '@class_place':plugin.settings.class.place,
                    '@class_time':plugin.settings.class.time,
                    '@class_day':plugin.settings.class.day,
                    '@place':plugin.settings.place_type,
                    '@time':time_to_screen(_hours.open.time),
                    '@day': weekday[_hours.open.day]
                  }
                );
              }
              $element.html(html);
            }
          }
        }
        /**
         * Close at message.
         */
        var close_at = function(day, time) {
          if (day != currentDay) {
            return Drupal.t(plugin.settings.strings.close.label_other_day,
              {
                '@class_place':plugin.settings.class.place,
                '@class_time':plugin.settings.class.time,
                '@class_day':plugin.settings.class.day,
                '@place':plugin.settings.place_type,
                '@time':time_to_screen(time),
                '@day': weekday[day]
              }
            );
          }
          else {
            return Drupal.t(plugin.settings.strings.close.label,
              {
                '@class_place':plugin.settings.class.place,
                '@class_time':plugin.settings.class.time,
                '@place':plugin.settings.place_type,
                '@time':time_to_screen(time)
              }
            );
          }
        }
        /**
         * Close in message.
         */
        var close_in = function(remaining) {
          $element.attr('data-close-in', 'true');
          return Drupal.t(plugin.settings.strings.close.label_in,
            {
              '@class_place':plugin.settings.class.place,
              '@class_time':plugin.settings.class.time,
              '@place':plugin.settings.place_type,
              '@time':remaining,
            }
          );
        }
        
        var diff = function(t1, t2, d1, d2) {
          var _d = 0;
          if (d1 != d2) {
            while (d1 != d2) {
              _d += 1440;
              d1 += 1;
              if (d1 == 7) {
                d1 = 0;
              }
            }
          }
          return _d + (+(t1.substr(0,2) * 60) + +(t1.substr(2,2))) - (+(t2.substr(0,2) * 60) + +(t2.substr(2,2)));
        }
        /**
         * Format time to dysplain on screen.
         */
        var time_to_screen = function (time) {
          return Drupal.t(plugin.settings.strings.open.time,
            {
              '@h':time.substr(0,2),
              '@m':time.substr(2,2)
            }
          );
        }
        
        var remaining_time = function(current, close) {
          var diff =  (close.substr(0,2) * 60 + close.substr(2,2)) - (current.substr(0,2) * 60 + current.substr(2,2));
          if (diff < 60) {
            return diff + ' minutes';
          }
          else {
            var h = Math.floor(diff / 60);
            var m = diff % 60;
          }
        }
        
        plugin.init();
        
    }
  /**
   * 
   * @param {type} options
   * @returns {google_place_opening_L2.$.fn@call;each}
   */
  $.fn.simpleGooglePlaces = function(options) {
    return this.each(function() {
      if (undefined == $(this).data('simpleGooglePlaces')) {
        var plugin = new $.simpleGooglePlaces(this, options);
        $(this).data('simpleGooglePlaces', plugin);
        console.log(plugin);
      }
    });
  }
})(jQuery);