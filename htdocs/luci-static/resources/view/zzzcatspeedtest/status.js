'use strict';
'require view';
'require dom';
'require rpc';
'require ui';
'require fs';
'require form';
'require uci';

var callInitList = rpc.declare({
	object: 'luci',
	method: 'getInitList',
	params: ['name'],
	expect: { '': {} }
});

var callInitAction = rpc.declare({
	object: 'luci',
	method: 'setInitAction',
	params: ['name', 'action'],
	expect: { result: false }
});

function asBool(v) {
	return v === true || v === 1 || v === '1' || v === 'true';
}

return view.extend({
	load: function() {
		return Promise.all([
			(L.loadCatalog ? L.loadCatalog('zzzcatspeedtest') : Promise.resolve()),
			L.resolveDefault(callInitList('zzzcatspeedtest'), null),
			L.resolveDefault(fs.stat('/usr/share/zzzcatspeedtest/speedtest-go'), null),
			uci.load('zzzcatspeedtest')
		]);
	},

	render: function(data) {
		var initStatus = data ? data[1] : null;
		var testStat = data ? data[2] : null;
		var binaryExists = !!(testStat && (testStat.type === 'file' || testStat.type === 'link'));
		var initInfo = initStatus && initStatus.zzzcatspeedtest ? initStatus.zzzcatspeedtest : null;
		var hasInitStatus = !!initInfo;
		var isRunning = hasInitStatus ? asBool(initInfo.running) : false;
		var isEnabled = hasInitStatus ? asBool(initInfo.enabled) : false;

		var listenPort = parseInt(uci.get('zzzcatspeedtest', 'main', 'listen_port'), 10);
		if (isNaN(listenPort) || listenPort <= 0)
			listenPort = 8989;

		var m, s, o;

		m = new form.Map('zzzcatspeedtest', _('ZZZCat Speedtest'),
			_('LAN network speed test tool. Backend listens on port %s.').format(listenPort));

		s = m.section(form.NamedSection, 'main', 'speedtest');
		s.anonymous = false;
		s.addremove = false;

		o = s.option(form.DummyValue, '_status', _('Status'));
		o.cfgvalue = function() {
			if (!hasInitStatus)
				return _('Unknown');

			return isRunning ? _('Running') : _('Stopped');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = isRunning ? 'green' : (hasInitStatus ? 'red' : '#d48806');
			return '<span style="color:' + color + ';font-weight:bold">' + status + '</span>';
		};

		o = s.option(form.DummyValue, '_autostart', _('Autostart'));
		o.cfgvalue = function() {
			if (!hasInitStatus)
				return _('Unknown');

			return isEnabled ? _('Enabled on boot') : _('Disabled on boot');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = isEnabled ? 'green' : (hasInitStatus ? 'red' : '#d48806');
			return '<span style="color:' + color + '">' + status + '</span>';
		};

		o = s.option(form.DummyValue, '_binary', _('Binary Status (speedtest-go)'));
		o.cfgvalue = function() {
			return binaryExists ? _('Installed') : _('Not Installed');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = binaryExists ? 'green' : 'red';
			return '<span style="color:' + color + '">' + status + '</span>';
		};

		o = s.option(form.DummyValue, '_rpc', _('RPC Status'));
		o.cfgvalue = function() {
			return hasInitStatus ? _('Available') : _('Unavailable (permission denied or service missing)');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = hasInitStatus ? 'green' : '#d48806';
			return '<span style="color:' + color + '">' + status + '</span>';
		};

		o = s.option(form.Button, '_start', _('Service Control'));
		o.inputtitle = isRunning ? _('Stop') : _('Start');
		o.inputstyle = isRunning ? 'reset' : 'apply';
		o.onclick = function() {
			if (!binaryExists) {
				ui.addNotification(null, dom.create('p', {}, _('Backend binary is missing. Please reinstall package zzzcatspeedtest.')), 'warning');
				return;
			}

			var action = isRunning ? 'stop' : 'start';
			return callInitAction('zzzcatspeedtest', action)
				.then(function() {
					ui.addNotification(null, dom.create('p', {}, _('Service %s command executed').format(action)));
					window.location.reload();
				})
				.catch(function(e) {
					ui.addNotification(null, dom.create('p', {}, _('Error: %s').format(e.message)), 'error');
				});
		};

		o = s.option(form.Button, '_autostart_btn', _('Autostart control'));
		o.inputtitle = isEnabled ? _('Disable autostart') : _('Enable autostart');
		o.inputstyle = isEnabled ? 'reset' : 'apply';
		o.onclick = function() {
			var action = isEnabled ? 'disable' : 'enable';
			return callInitAction('zzzcatspeedtest', action)
				.then(function() {
					ui.addNotification(null, dom.create('p', {}, _('Service %s command executed').format(action)));
					window.location.reload();
				})
				.catch(function(e) {
					ui.addNotification(null, dom.create('p', {}, _('Error: %s').format(e.message)), 'error');
				});
		};

		o = s.option(form.Button, '_open', _('Open test page'));
		o.inputtitle = _('Open');
		o.inputstyle = 'action';
		o.onclick = function() {
			window.open('http://' + window.location.hostname + ':' + listenPort, '_blank');
		};

		return m.render();
	}
});