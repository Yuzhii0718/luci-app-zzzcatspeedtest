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

function parseInteger(value) {
	if (value == null || value === '')
		return NaN;

	return parseInt(String(value), 10);
}

function validatePort(value, allowZero) {
	var n = parseInteger(value);

	if (isNaN(n) || String(n) !== String(value).trim())
		return _('Expecting a valid integer');

	if (allowZero)
		return (n >= 0 && n <= 65535) ? true : _('Expecting a port value between 0 and 65535');

	return (n >= 1 && n <= 65535) ? true : _('Expecting a port value between 1 and 65535');
}

function validateFloatInRange(value, min, max, label) {
	if (value == null || value === '')
		return true;

	var n = Number(value);
	if (isNaN(n))
		return _('Expecting a valid number');

	if (n < min || n > max)
		return _('%s must be between %s and %s').format(label, min, max);

	return true;
}

function isExecOk(ret) {
	if (!ret)
		return false;

	if (typeof ret.code === 'number')
		return ret.code === 0;

	return false;
}

function hasStdout(ret) {
	return !!(ret && typeof ret.stdout === 'string' && ret.stdout.trim().length > 0);
}

function stdoutContains(ret, pattern) {
	if (!ret || typeof ret.stdout !== 'string')
		return false;

	return pattern.test(ret.stdout);
}

function parseBuildInfo(raw) {
	if (!raw)
		return null;

	try {
		return JSON.parse(raw);
	}
	catch (e) {
		return null;
	}
}

return view.extend({
	load: function() {
		return Promise.all([
			(L.loadCatalog ? L.loadCatalog('zzzcatspeedtest') : Promise.resolve()),
			L.resolveDefault(callInitList('zzzcatspeedtest'), null),
			L.resolveDefault(fs.stat('/usr/share/zzzcatspeedtest/speedtest-go'), null),
			L.resolveDefault(fs.exec('/etc/init.d/zzzcatspeedtest', ['running']), null),
			L.resolveDefault(fs.exec('/bin/busybox', ['pidof', 'speedtest-go']), null),
			L.resolveDefault(fs.read('/usr/share/zzzcatspeedtest/buildinfo.json'), null),
			L.resolveDefault(fs.stat('/usr/share/zzzcatspeedtest/buildinfo.json'), null),
			uci.load('zzzcatspeedtest')
		]);
	},

	render: function(data) {
		var initStatus = data ? data[1] : null;
		var testStat = data ? data[2] : null;
		var runningByInitScript = data ? data[3] : null;
		var runningByPidof = data ? data[4] : null;
		var buildInfo = parseBuildInfo(data ? data[5] : null);
		var buildInfoStat = data ? data[6] : null;
		var binaryExists = !!(testStat && (testStat.type === 'file' || testStat.type === 'link'));
		var initInfo = initStatus && initStatus.zzzcatspeedtest ? initStatus.zzzcatspeedtest : null;
		var hasInitStatus = !!initInfo;
		var runningByInitList = hasInitStatus ? asBool(initInfo.running) : false;
		var runningByScript = isExecOk(runningByInitScript) || stdoutContains(runningByInitScript, /running/i);
		var runningByProcess = isExecOk(runningByPidof) || hasStdout(runningByPidof);
		var isRunning = runningByInitList || runningByScript || runningByProcess;
		var isEnabled = hasInitStatus ? asBool(initInfo.enabled) : false;

		var runningSources = [];
		if (runningByInitList)
			runningSources.push(_('Init list'));
		if (runningByScript)
			runningSources.push(_('Init script'));
		if (runningByProcess)
			runningSources.push(_('Process check'));

		var statusSourceText = runningSources.length
			? runningSources.join(', ')
			: (hasInitStatus ? _('No running source detected') : _('Init status unavailable'));

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
			if (!hasInitStatus && !isRunning)
				return _('Unknown');

			return isRunning ? _('Running') : _('Stopped');
		};
		o.textvalue = function() {
			var status = this.cfgvalue();
			var color = isRunning ? 'green' : (hasInitStatus ? 'red' : '#d48806');
			return '<span style="color:' + color + ';font-weight:bold">' + status + '</span>';
		};

		o = s.option(form.DummyValue, '_status_source', _('Status source'));
		o.cfgvalue = function() {
			return statusSourceText;
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

		o = s.option(form.DummyValue, '_buildinfo', _('Build Info'));
		o.cfgvalue = function() {
			if (!buildInfo) {
				if (buildInfoStat && buildInfoStat.mtime)
					return _('Version: %s | Build time: %s').format(_('Unknown'), String(buildInfoStat.mtime));

				return _('Unknown');
			}

			var version = buildInfo.version || 'n/a';
			var ts = buildInfo.build_timestamp || 'n/a';
			return _('Version: %s | Build time: %s').format(version, ts);
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

		o = s.option(form.Value, 'listen_port', _('Listen port'));
		o.datatype = 'port';
		o.placeholder = '8989';
		o.default = '8989';
		o.rmempty = false;
		o.description = _('Port used by web UI and test API.');
		o.validate = function(section_id, value) {
			return validatePort(value, false);
		};

		o = s.option(form.Value, 'bind_address', _('Bind address'));
		o.placeholder = '0.0.0.0';
		o.rmempty = true;
		o.description = _('Optional. Leave empty to listen on all interfaces.');

		o = s.option(form.Flag, '_show_advanced', _('Advanced mode'));
		o.default = '0';
		o.rmempty = false;
		o.description = _('Enable to show advanced configuration options.');
		o.write = function() {};
		o.remove = function() {};

		o = s.option(form.Value, 'proxyprotocol_port', _('Proxy protocol port'));
		o.placeholder = '0';
		o.default = '0';
		o.rmempty = false;
		o.description = _('0 disables proxy protocol listener.');
		o.depends('_show_advanced', '1');
		o.validate = function(section_id, value) {
			return validatePort(value, true);
		};

		o = s.option(form.Value, 'server_lat', _('Server latitude'));
		o.placeholder = '1';
		o.default = '1';
		o.rmempty = false;
		o.description = _('Optional display value used by speedtest UI.');
		o.depends('_show_advanced', '1');
		o.validate = function(section_id, value) {
			return validateFloatInRange(value, -90, 90, _('Server latitude'));
		};

		o = s.option(form.Value, 'server_lng', _('Server longitude'));
		o.placeholder = '1';
		o.default = '1';
		o.rmempty = false;
		o.description = _('Optional display value used by speedtest UI.');
		o.depends('_show_advanced', '1');
		o.validate = function(section_id, value) {
			return validateFloatInRange(value, -180, 180, _('Server longitude'));
		};

		o = s.option(form.Value, 'ipinfo_api_key', _('IPInfo API key'));
		o.password = true;
		o.rmempty = true;
		o.description = _('Optional. Used for IP geolocation enrichment.');
		o.depends('_show_advanced', '1');

		o = s.option(form.Value, 'assets_path', _('Assets path'));
		o.placeholder = '/usr/share/zzzcatspeedtest/assets';
		o.rmempty = true;
		o.description = _('Leave empty to use bundled assets.');
		o.depends('_show_advanced', '1');

		o = s.option(form.Flag, 'redact_ip_addresses', _('Redact IP addresses'));
		o.default = '0';
		o.rmempty = false;
		o.description = _('Enable to hide client IP addresses in test results.');

		o = s.option(form.ListValue, 'database_type', _('Database type'));
		o.value('none', _('None'));
		o.value('bolt', _('BoltDB'));
		o.value('sqlite', _('SQLite'));
		o.value('mysql', _('MySQL'));
		o.value('postgres', _('PostgreSQL'));
		o.default = 'none';
		o.rmempty = false;
		o.description = _('Storage backend for speedtest history.');

		o = s.option(form.Value, 'database_file', _('Database file'));
		o.placeholder = '/var/lib/zzzcatspeedtest/speedtest.db';
		o.default = '/var/lib/zzzcatspeedtest/speedtest.db';
		o.rmempty = true;
		o.description = _('Used by BoltDB / SQLite backends.');
		o.depends({ database_type: 'bolt', _show_advanced: '1' });
		o.depends({ database_type: 'sqlite', _show_advanced: '1' });

		o = s.option(form.Value, 'database_hostname', _('Database host'));
		o.placeholder = '127.0.0.1:3306';
		o.rmempty = true;
		o.description = _('Host:port for MySQL / PostgreSQL.');
		o.depends({ database_type: 'mysql', _show_advanced: '1' });
		o.depends({ database_type: 'postgres', _show_advanced: '1' });

		o = s.option(form.Value, 'database_name', _('Database name'));
		o.rmempty = true;
		o.depends({ database_type: 'mysql', _show_advanced: '1' });
		o.depends({ database_type: 'postgres', _show_advanced: '1' });

		o = s.option(form.Value, 'database_username', _('Database username'));
		o.rmempty = true;
		o.depends({ database_type: 'mysql', _show_advanced: '1' });
		o.depends({ database_type: 'postgres', _show_advanced: '1' });

		o = s.option(form.Value, 'database_password', _('Database password'));
		o.password = true;
		o.rmempty = true;
		o.depends({ database_type: 'mysql', _show_advanced: '1' });
		o.depends({ database_type: 'postgres', _show_advanced: '1' });

		return m.render();
	}
});