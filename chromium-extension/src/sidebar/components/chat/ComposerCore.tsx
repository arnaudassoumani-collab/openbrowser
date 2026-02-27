import React, { useMemo } from "react";
import {
  SendOutlined,
  StopOutlined,
  PaperClipOutlined,
  PlusOutlined,
  HistoryOutlined,
  SettingOutlined,
  DownOutlined,
  UpOutlined,
  MoreOutlined
} from "@ant-design/icons";
import { Button, Dropdown, type MenuProps } from "antd";
import { WebpageMentionInput } from "../WebpageMentionInput";

type ComposerCoreProps = {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onOpenFilePicker: () => void;
  onShowSessionHistory: () => void;
  onOpenSettings: () => void;
  onNewSession: () => void;
  onToggleAdvanced: () => void;
  advancedOpen: boolean;
  sending: boolean;
  currentMessageId: string | null;
  isEmpty: boolean;
  quickActionsNode?: React.ReactNode;
};

export const ComposerCore: React.FC<ComposerCoreProps> = ({
  inputValue,
  onInputChange,
  onSend,
  onStop,
  onOpenFilePicker,
  onShowSessionHistory,
  onOpenSettings,
  onNewSession,
  onToggleAdvanced,
  advancedOpen,
  sending,
  currentMessageId,
  isEmpty,
  quickActionsNode
}) => {
  const disabled = sending || currentMessageId !== null;
  const moreItems = useMemo<MenuProps["items"]>(
    () => [
      {
        key: "attach",
        icon: <PaperClipOutlined />,
        label: "Attach file"
      },
      {
        key: "history",
        icon: <HistoryOutlined />,
        label: "Session history"
      },
      {
        key: "settings",
        icon: <SettingOutlined />,
        label: "Settings"
      },
      {
        key: "advanced",
        icon: advancedOpen ? <UpOutlined /> : <DownOutlined />,
        label: advancedOpen ? "Hide advanced" : "Show advanced"
      },
      {
        key: "new",
        icon: <PlusOutlined />,
        label: "New session"
      }
    ],
    [advancedOpen]
  );

  const handleMoreClick: MenuProps["onClick"] = ({ key }) => {
    switch (String(key)) {
      case "attach":
        onOpenFilePicker();
        break;
      case "history":
        onShowSessionHistory();
        break;
      case "settings":
        onOpenSettings();
        break;
      case "advanced":
        onToggleAdvanced();
        break;
      case "new":
        onNewSession();
        break;
      default:
        break;
    }
  };

  return (
    <div
      className="soca-composer-shell bg-theme-input border-theme-input shadow-sm hover:shadow-md transition-shadow radius-8px"
      style={{ borderWidth: "1px", borderStyle: "solid" }}
    >
      <div className="px-4 pt-3 pb-2 min-w-0">
        <WebpageMentionInput
          value={inputValue}
          onChange={onInputChange}
          disabled={disabled}
          onSend={onSend}
        />
      </div>

      <div className="soca-composer-toolbar border-theme-input">
        <div className="soca-composer-toolbar-actions">
          <Button
            type="text"
            icon={<PaperClipOutlined />}
            onClick={onOpenFilePicker}
            disabled={disabled}
            className="text-theme-icon soca-btn-frequent"
            data-testid="soca-btn-attach"
          />
          <Button
            type="text"
            icon={<HistoryOutlined />}
            onClick={onShowSessionHistory}
            disabled={disabled}
            className="text-theme-icon soca-btn-frequent"
            data-testid="soca-btn-history"
          />
          {quickActionsNode}
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={onOpenSettings}
            disabled={disabled}
            className="text-theme-icon soca-btn-frequent"
            data-testid="soca-btn-settings"
          />
          <Button
            type="text"
            onClick={onToggleAdvanced}
            disabled={disabled}
            className="text-theme-icon soca-btn-optional"
            icon={advancedOpen ? <UpOutlined /> : <DownOutlined />}
            data-testid="soca-btn-advanced"
          >
            <span className="soca-btn-label">Advanced</span>
          </Button>
          <Dropdown
            trigger={["click"]}
            placement="topLeft"
            menu={{
              items: moreItems,
              onClick: handleMoreClick
            }}
          >
            <Button
              type="text"
              icon={<MoreOutlined />}
              disabled={disabled}
              className="text-theme-icon"
              data-testid="soca-btn-more"
              aria-label="More actions"
            >
              <span className="soca-btn-label">More</span>
            </Button>
          </Dropdown>
        </div>

        <div className="soca-composer-toolbar-vitals">
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={onNewSession}
            disabled={disabled}
            className="soca-secondary-btn"
            data-testid="soca-btn-new"
          >
            <span className="soca-btn-label">New (+)</span>
          </Button>
          {currentMessageId ? (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={onStop}
              className="soca-danger-btn"
              data-testid="soca-btn-stop"
            >
              <span className="soca-btn-label">Stop</span>
            </Button>
          ) : (
            <Button
              size="small"
              icon={<SendOutlined />}
              onClick={onSend}
              loading={sending}
              disabled={sending || isEmpty}
              className="soca-primary-btn"
              data-testid="soca-btn-send"
            >
              <span className="soca-btn-label">Send (Enter)</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
