include $(TOPDIR)/rules.mk

PKG_NAME:=zzzcatspeedtest
PKG_VERSION:=0.0.4
PKG_RELEASE:=1

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)
PKG_LICENSE:=Proprietary
PKG_MAINTAINER:=Yuzhii0718 <yuzhii0718@outlook.com>

include $(INCLUDE_DIR)/package.mk

define Package/zzzcatspeedtest
	SECTION:=net
	CATEGORY:=Network
	TITLE:=ZZZCat Speedtest backend (prebuilt arm64)
	DEPENDS:=+libpthread @TARGET_aarch64
endef

define Package/zzzcatspeedtest/description
Prebuilt arm64 speedtest backend with minimal configuration helpers.
endef

define Package/luci-app-zzzcatspeedtest
	SECTION:=luci
	CATEGORY:=LuCI
	SUBMENU:=3. Applications
	TITLE:=LuCI support for ZZZCat Speedtest
	DEPENDS:=+zzzcatspeedtest +luci-base +luci-lua-runtime
	PKGARCH:=all
endef

define Package/luci-app-zzzcatspeedtest/description
LuCI web interface for managing ZZZCat Speedtest service.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	# Use speedtest-go payload
	$(CP) ./bin/* $(PKG_BUILD_DIR)/
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/zzzcatspeedtest/install
	$(INSTALL_DIR) $(1)/usr/share/zzzcatspeedtest
	# Install speedtest-go backend binary
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/speedtest-arm64 $(1)/usr/share/zzzcatspeedtest/speedtest-arm64
	# Install default settings; if an upstream settings.toml is present, prefer it
	if [ -f $(PKG_BUILD_DIR)/settings.toml ]; then \
		$(INSTALL_DATA) $(PKG_BUILD_DIR)/settings.toml $(1)/usr/share/zzzcatspeedtest/settings.toml; \
	else \
		$(INSTALL_DATA) ./files/usr/share/zzzcatspeedtest/settings.toml $(1)/usr/share/zzzcatspeedtest/settings.toml; \
	fi

	# Install bundled web assets for speedtest-go
	$(INSTALL_DIR) $(1)/usr/share/zzzcatspeedtest/assets
	$(CP) ./web/assets/* $(1)/usr/share/zzzcatspeedtest/assets/

	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/etc/init.d/zzzcatspeedtest $(1)/etc/init.d/zzzcatspeedtest

	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/etc/config/zzzcatspeedtest $(1)/etc/config/zzzcatspeedtest
endef

define Package/luci-app-zzzcatspeedtest/install
	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/zzzcatspeedtest
	$(INSTALL_DATA) ./htdocs/luci-static/resources/view/zzzcatspeedtest/status.js $(1)/www/luci-static/resources/view/zzzcatspeedtest/status.js

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-zzzcatspeedtest.json $(1)/usr/share/luci/menu.d/luci-app-zzzcatspeedtest.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-zzzcatspeedtest.json $(1)/usr/share/rpcd/acl.d/luci-app-zzzcatspeedtest.json
endef

$(eval $(call BuildPackage,zzzcatspeedtest))
$(eval $(call BuildPackage,luci-app-zzzcatspeedtest))