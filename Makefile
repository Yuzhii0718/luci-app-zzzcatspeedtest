include $(TOPDIR)/rules.mk

PKG_NAME:=zzzcatspeedtest
PKG_VERSION:=0.1.0
PKG_RELEASE:=1

PKG_BUILD_DIR:=$(BUILD_DIR)/$(PKG_NAME)
SPEEDTEST_VERSION:=1.1.5
PKG_LICENSE:=Proprietary
PKG_MAINTAINER:=Yuzhii0718 <yuzhii0718@outlook.com>

include $(INCLUDE_DIR)/package.mk

SPEEDTEST_TARGET_ARCH:=$(if $(TARGET_ARCH),$(TARGET_ARCH),$(if $(TARGET_ARCH_PACKAGES),$(TARGET_ARCH_PACKAGES),$(if $(ARCH),$(ARCH),$(CONFIG_TARGET_ARCH_PACKAGES))))
SPEEDTEST_TARGET_CPU:=$(if $(TARGET_CPU),$(TARGET_CPU),$(CPU_TYPE))
SPEEDTEST_FLOAT:=$(if $(CONFIG_SOFT_FLOAT),softfloat,hardfloat)
SPEEDTEST_BIN:=
SPEEDTEST_ARCHIVE_SUFFIX:=
ifneq (,$(findstring aarch64,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-arm64
	SPEEDTEST_ARCHIVE_SUFFIX:=arm64
else ifneq (,$(findstring arm,$(SPEEDTEST_TARGET_ARCH)))
	ifneq (,$(findstring armv5,$(SPEEDTEST_TARGET_CPU)))
		SPEEDTEST_BIN:=speedtest-armv5
		SPEEDTEST_ARCHIVE_SUFFIX:=armv5
	else ifneq (,$(findstring armv6,$(SPEEDTEST_TARGET_CPU)))
		SPEEDTEST_BIN:=speedtest-armv6
		SPEEDTEST_ARCHIVE_SUFFIX:=armv6
	else
		SPEEDTEST_BIN:=speedtest-armv7
		SPEEDTEST_ARCHIVE_SUFFIX:=armv7
	endif
else ifneq (,$(findstring x86_64,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-amd64
	SPEEDTEST_ARCHIVE_SUFFIX:=amd64
else ifneq (,$(filter i386 i486 i586 i686,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-386
	SPEEDTEST_ARCHIVE_SUFFIX:=386
else ifneq (,$(filter mips64el mips64le,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-mips64le-$(SPEEDTEST_FLOAT)
	SPEEDTEST_ARCHIVE_SUFFIX:=mips64le_$(SPEEDTEST_FLOAT)
else ifneq (,$(filter mips64,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-mips64-$(SPEEDTEST_FLOAT)
	SPEEDTEST_ARCHIVE_SUFFIX:=mips64_$(SPEEDTEST_FLOAT)
else ifneq (,$(filter mipsel mipsle,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-mipsle-$(SPEEDTEST_FLOAT)
	SPEEDTEST_ARCHIVE_SUFFIX:=mipsle_$(SPEEDTEST_FLOAT)
else ifneq (,$(filter mips,$(SPEEDTEST_TARGET_ARCH)))
	SPEEDTEST_BIN:=speedtest-mips-$(SPEEDTEST_FLOAT)
	SPEEDTEST_ARCHIVE_SUFFIX:=mips_$(SPEEDTEST_FLOAT)
endif

PO2LMO:=$(STAGING_DIR_HOSTPKG)/bin/po2lmo
SPEEDTEST_FILE:=speedtest-go_$(SPEEDTEST_VERSION)_linux_$(SPEEDTEST_ARCHIVE_SUFFIX).tar.gz
SPEEDTEST_URL:=https://github.com/librespeed/speedtest-go/releases/download/v$(SPEEDTEST_VERSION)
SPEEDTEST_CHECKSUMS:=$(DL_DIR)/speedtest-go_$(SPEEDTEST_VERSION)_checksums.txt
SPEEDTEST_CHECKSUMS_TMP:=$(DL_DIR)/checksums.txt

define Package/zzzcatspeedtest
	SECTION:=net
	CATEGORY:=Network
	TITLE:=ZZZCat Speedtest backend (prebuilt speedtest-go)
	DEPENDS:=+libpthread
endef

define Package/zzzcatspeedtest/description
Prebuilt speedtest-go backend with minimal configuration helpers.
endef

define Package/luci-app-zzzcatspeedtest
	SECTION:=luci
	CATEGORY:=LuCI
	SUBMENU:=3. Applications
	TITLE:=LuCI support for ZZZCat Speedtest
	DEPENDS:=+zzzcatspeedtest +luci-base +luci-compat
	PKGARCH:=all
endef

define Package/luci-app-zzzcatspeedtest/description
LuCI web interface for managing ZZZCat Speedtest service.
endef

define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	# Use speedtest-go payload (downloaded per target arch)
	if [ -z "$(SPEEDTEST_ARCHIVE_SUFFIX)" ]; then \
		echo "Unsupported target arch: $(SPEEDTEST_TARGET_ARCH) $(SPEEDTEST_TARGET_CPU)" >&2; \
		exit 1; \
	fi
	if [ ! -f $(DL_DIR)/$(SPEEDTEST_FILE) ]; then \
		$(SCRIPT_DIR)/download.pl $(DL_DIR) $(SPEEDTEST_FILE) skip $(SPEEDTEST_URL); \
	fi
	if [ ! -f $(SPEEDTEST_CHECKSUMS) ]; then \
		$(SCRIPT_DIR)/download.pl $(DL_DIR) checksums.txt skip $(SPEEDTEST_URL) || true; \
		if [ -f $(SPEEDTEST_CHECKSUMS_TMP) ]; then \
			mv -f $(SPEEDTEST_CHECKSUMS_TMP) $(SPEEDTEST_CHECKSUMS); \
		fi; \
	fi
	if [ -f $(SPEEDTEST_CHECKSUMS) ]; then \
		(cd $(DL_DIR) && grep -F " $(SPEEDTEST_FILE)" "$(SPEEDTEST_CHECKSUMS)" | sha256sum -c -) || \
			echo "WARNING: checksum verify failed for $(SPEEDTEST_FILE)"; \
	else \
		echo "WARNING: checksums.txt missing, skip verify for $(SPEEDTEST_FILE)"; \
	fi
	$(TAR) -xzf $(DL_DIR)/$(SPEEDTEST_FILE) -C $(PKG_BUILD_DIR)
	FOUND_BIN=""; \
	FOUND_BIN=`find $(PKG_BUILD_DIR) \( -type f -o -type l \) -perm -111 -name 'speedtest*' -print -quit`; \
	if [ -z "$$$$FOUND_BIN" ]; then \
		if [ -f $(PKG_BUILD_DIR)/speedtest-go ]; then \
			FOUND_BIN="$(PKG_BUILD_DIR)/speedtest-go"; \
		elif [ -f $(PKG_BUILD_DIR)/speedtest ]; then \
			FOUND_BIN="$(PKG_BUILD_DIR)/speedtest"; \
		else \
			FOUND_BIN=`find $(PKG_BUILD_DIR) \( -type f -o -type l \) \( -name 'speedtest-go' -o -name 'speedtest' -o -name 'speedtest*' \) -print -quit`; \
		fi; \
	fi; \
	if [ -n "$$$$FOUND_BIN" ]; then \
		mv -f "$$$$FOUND_BIN" $(PKG_BUILD_DIR)/$(SPEEDTEST_BIN); \
	else \
		echo "WARNING: speedtest-go binary not found in archive $(SPEEDTEST_FILE)"; \
	fi
endef

define Build/Configure
endef

define Build/Compile
	$(PO2LMO) ./po/zh_Hans/zzzcatspeedtest.po $(PKG_BUILD_DIR)/zzzcatspeedtest.zh-cn.lmo
endef

define Package/zzzcatspeedtest/install
	$(INSTALL_DIR) $(1)/usr/share/zzzcatspeedtest
	# Install speedtest-go backend binary
	if [ -z "$(SPEEDTEST_BIN)" ]; then \
		echo "Unsupported target arch: $(SPEEDTEST_TARGET_ARCH) $(SPEEDTEST_TARGET_CPU)" >&2; \
		exit 1; \
	fi
	if [ ! -f $(PKG_BUILD_DIR)/$(SPEEDTEST_BIN) ]; then \
		FOUND_BIN=""; \
		FOUND_BIN=`find $(PKG_BUILD_DIR) \( -type f -o -type l \) -perm -111 -name 'speedtest*' -print -quit`; \
		if [ -z "$$$$FOUND_BIN" ]; then \
			if [ -f $(PKG_BUILD_DIR)/speedtest-go ]; then \
				FOUND_BIN="$(PKG_BUILD_DIR)/speedtest-go"; \
			elif [ -f $(PKG_BUILD_DIR)/speedtest ]; then \
				FOUND_BIN="$(PKG_BUILD_DIR)/speedtest"; \
			else \
				FOUND_BIN=`find $(PKG_BUILD_DIR) \( -type f -o -type l \) \( -name 'speedtest-go' -o -name 'speedtest' -o -name 'speedtest*' \) -print -quit`; \
			fi; \
		fi; \
		if [ -n "$$$$FOUND_BIN" ]; then \
			mv -f "$$$$FOUND_BIN" $(PKG_BUILD_DIR)/$(SPEEDTEST_BIN); \
		fi; \
	fi
	if [ ! -f $(PKG_BUILD_DIR)/$(SPEEDTEST_BIN) ]; then \
		echo "Missing backend binary: $(SPEEDTEST_BIN). Check archive contents or DL_DIR cache." >&2; \
		exit 1; \
	fi
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(SPEEDTEST_BIN) $(1)/usr/share/zzzcatspeedtest/speedtest-go
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

	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) $(PKG_BUILD_DIR)/zzzcatspeedtest.zh-cn.lmo $(1)/usr/lib/lua/luci/i18n/zzzcatspeedtest.zh-cn.lmo

	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./root/usr/share/luci/menu.d/luci-app-zzzcatspeedtest.json $(1)/usr/share/luci/menu.d/luci-app-zzzcatspeedtest.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./root/usr/share/rpcd/acl.d/luci-app-zzzcatspeedtest.json $(1)/usr/share/rpcd/acl.d/luci-app-zzzcatspeedtest.json
endef

$(eval $(call BuildPackage,zzzcatspeedtest))
$(eval $(call BuildPackage,luci-app-zzzcatspeedtest))