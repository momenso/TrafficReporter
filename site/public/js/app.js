// TrafficReporter

var app = {
    
	model: {},
	view: {},
	tabs: {
        monitor: { index: 0 },
        report: { index: 1 }
    },

	platform: /Android/.test(navigator.userAgent) ? 'android': 'ios',
	
	initialtab: 'monitor'
}

var bb = {
    model: {},
    view: {}
}

bb.init = function() {

    bb.model.State = Backbone.Model.extend({
        defaults: {
            content: 'none'
        },
    });


    bb.model.Report = Backbone.Model.extend(_.extend({

		initialize: function(item) {
			var self = this;
			_.bindAll(self);
		},
		
    }));


	bb.model.ReportList = Backbone.Collection.extend({

        model: bb.model.Report,

        url: '/api/rest/report',

        initialize: function() {
            var self = this;
            _.bindAll(self);
        }
		
    });


    bb.view.Navigation = Backbone.View.extend({
        initialize: function(items) {
            var self = this;
            _.bindAll(self);

            self.elem = {
                header: $("#header"),
                footer: $("#footer"),
				login_btn: $("#login_btn"),
				logout_btn: $("#logout_btn")
            }

            function handletab(tabname) {
                return function() {
                    app.model.state.set({
                        current: tabname
                    })
                }
            }

            var tabindex = 0
            for (var tabname in app.tabs) {
                $("#tab_" + tabname).tap(handletab(tabname));
            }

            app.scrollheight = window.innerHeight - self.elem.header.height() - self.elem.footer.height()

			app.model.state.on('change:user', function() { 
				self.render();
			});
        },

        render: function() { 
	        var self = this;
			var user = app.model.state.get('user');
			
			if (user) {
				self.elem.login_btn.hide();
				self.elem.logout_btn.show();
			} else {
				self.elem.login_btn.show();
				self.elem.logout_btn.hide();				
			}
			
			return self;
		}
    })


    bb.view.Content = Backbone.View.extend({
        initialize: function(initialtab) {
            var self = this;
            _.bindAll(self);

            self.current = initialtab;
            self.scrollers = {};

            app.model.state.on('change:current', self.tabchange);

            window.onresize = function() {
                self.render();
            };

            app.model.state.on('scroll-refresh', function() {
                self.render();
            });
        },

        render: function() {
            var self = this;

            app.view[self.current] && app.view[self.current].render();

	        var content = $("#content_" + self.current);
			var isScrollable = content.hasClass('scroller');
			if (isScrollable) {
				
	            if (!self.scrollers[self.current]) {
	                self.scrollers[self.current] = new iScroll("content_" + self.current);
	            }
				
	            content.height(app.scrollheight);

	            setTimeout(function() {
					var scroller = self.scrollers[self.current];
					if (scroller) scroller.refresh();
	            },
	            300);
			}
        },

        tabchange: function() {
            var self = this;

            var previous = self.current;
            var current = app.model.state.get('current');
            // console.log('tabchange prev=' + previous + ' cur=' + current);

            $("#content_" + previous).hide().removeClass('leftin').removeClass('rightin');
            $("#content_" + current).show().addClass(app.tabs[previous].index <= app.tabs[current].index ? 'leftin': 'rightin');

			$("#tab_" + previous).removeClass('ui-btn-active');
			$("#tab_" + current).addClass('ui-btn-active');
			
            self.current = current;

            self.render();
        }
    })


    bb.view.Monitor = Backbone.View.extend({
        initialize: function() {
            var self = this;
            _.bindAll(self);

            self.elem = {
				currentLocation: $('input#currentLocation'),
				speed: $('input#speed'),
				list: $('#reportsListView')
            }

            function call_update_button(name) {
                return function() {
                    self.update_button(name);
                }
            }

            document.addEventListener("backbutton", call_update_button('back'));
            document.addEventListener("menubutton", call_update_button('menu'));
            document.addEventListener("searchbutton", call_update_button('search'));

			self.monitor_geolocation();
			self.reports_refresher(3000);
        },

        render: function() { },
		
		reports_refresher: function(interval) {
			var self = this;
			var curLocation = app.model.state.get('location');
			if (curLocation) {
				self.request_reports(curLocation);
			}
			
			// gradual decrease of the refresh rate
			if (interval < 6000) {
				interval += 1000;
			}
			
			setTimeout(function() { self.reports_refresher(interval); }, interval);
		},
				
		request_reports: function(currentLocation) {
			var self = this;
			app.model.Reports.fetch({
				data: { location: currentLocation },
				async: false,

				success: function() {
					self.add_all_reports();
				},

				error: function(err) {
					console.log('failed to fetch reports. ' + err.statusText);
				}
			});
		},

		monitor_geolocation: function() {
			var self = this;
			navigator.geolocation.watchPosition(
				function(position) {
					var latitude  = position.coords.latitude;
					var longitude = position.coords.longitude;
					var speed = position.coords.speed | 0;
					var timestamp = new Date(position.timestamp);

					self.elem.speed.val(speed);
			
					//console.log('currentLocation: loc=' + latitude + "," + longitude);
					//alert('currentLocation: loc=' + latitude + "," + longitude);
					var geocoder = new google.maps.Geocoder();
					var latlng = new google.maps.LatLng(latitude, longitude);
					geocoder.geocode( {'latLng': latlng}, function(results, status) {
				      if (status == google.maps.GeocoderStatus.OK) {
				        if (results[0]) {
							var curLocation = results[0].formatted_address;
							var lastKnownLocation = app.model.state.get('location');
							if (curLocation != lastKnownLocation) {
								app.model.state.set({ location : curLocation });
								self.request_reports(curLocation);
								self.elem.currentLocation.val(curLocation);
							}
				        }
				      } else {
						alert("Geolocation resolution: " + status);
				      }
				},
				
				function(error) {
					alert('Geolocation not available!');
					console.log('GeoLocation error: ' + error.code + ' - ' + error.message);
				},
				
				// options
				{
					frequency : 5000 
				});
			})
		},

		add_all_reports: function() {
			var self = this;
			
			// empty list
			self.elem.list.children().not('[role=heading]').remove('li');
			
			if (app.model.Reports.length > 0) {
						
				app.model.Reports.each(function(report) {
					report = report.toJSON();
					self.add_report(report.user, report.comment, report.speed, report.created);
				});
			
			} else {
				self.show_no_reports();
			}
			
			app.model.state.trigger('scroll-refresh');
		},

		add_report: function(user, comment, speed, created) {
            var self = this;
			var clock = Date.now() - created;

			if (clock >= 60000) {
				var hours = Math.round(clock / 3600000);
				var time = "";
				if (hours > 0) {
					time = hours + "h ";
					clock = clock % 3600000;
				}
				var minutes = Math.floor(clock / 60000);
				time += minutes + "m";
			} else {
				time = (clock > 2000) ? Math.round(clock / 1000) + 's' : 'just now';
			}

			$('<li/>')
	           	.append($("<b>", { text: comment }))
	           	.append($("<p>", { text: user + " @ " + speed + " km/h" }))
				.append($("<span />", { text: time, "class": "ui-li-count" }))
				.appendTo(self.elem.list);

            self.elem.list.listview('refresh');
		},
		
		show_no_reports : function() {
			var self = this;
			
            $('<li/>')
            	.append($('<p>', { text: 'No reports for this location, be the first!' }))
            	.appendTo(self.elem.list);

            self.elem.list.listview('refresh');
		},

        update_button: function(name) {
            var self = this;
            self.elem.button.text(name);
        }
    })


    bb.view.Report = Backbone.View.extend({
        initialize: function() {
            var self = this;
            _.bindAll(self);

            self.elem = {
				currentLocation: $('input#currentLocation'),
				speed: $('input#speed'),
				comment: $('textarea#comment'),
				send: $('button#send')
            }

            self.elem.send.tap(self.sendreport);
        },

        render: function() { 
			var self = this;
			self.elem.comment.val('');
			$(self).css('min-height', app.scrollheight+'px');
		},

		sendreport: function() {
            var self = this;
			var user = app.model.state.get('user');
			if (user) {
				
				var report = app.model.Reports.create({
					user: user.username,
					location: self.elem.currentLocation.val(),
					speed: self.elem.speed.val(),
					comment: self.elem.comment.val()
				}, { wait: true });

				report.on('error', function(rep, error) {
					setTimeout(
						alert('Failed to submit report: ' + error.statusText), 
						1000);
				});
				
			} else {
				alert('You must log in first!');
			}
			
		    $("#tab_" + app.initialtab).tap();
		}
    })

}

app.boot = function() {
    document.ontouchmove = function(e) {
        e.preventDefault();
    }
    $('#main').live('pagebeforecreate', function() {
       	app.boot_platform();
    })
}

app.boot_platform = function() {
    if ('android' == app.platform) {
		$('#footer').hide();
		$('#android_navbar').show();
    } else {
		$('#android_navbar').remove();
	}
}

app.start = function() {
    $("#tab_" + app.initialtab).tap();

	http.get('/user', function(user) {
	    if (user.id) {
			app.model.state.set({user:user})
		}
	});

}

app.erroralert = function(error) {
    alert(error);
}

app.init = function() {
    console.log('start init');

    bb.init();

    app.model.state = new bb.model.State();
    app.model.Reports = new bb.model.ReportList();

    app.view.navigation = new bb.view.Navigation(app.initialtab);
    app.view.navigation.render();

    app.view.content = new bb.view.Content(app.initialtab);
    app.view.content.render();

    app.view.monitor = new bb.view.Monitor();
    app.view.Report = new bb.view.Report();
	app.view.Report.render();

    app.start();

    console.log('end init');
}

app.boot();

$(app.init);
