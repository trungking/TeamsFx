// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as vscode from "vscode";

import { isCopilotPluginEnabled } from "@microsoft/teamsfx-core";
import { TelemetryTriggerFrom } from "../../telemetry/extTelemetryEvents";
import { localize } from "../../utils/localizeUtils";
import { DynamicNode } from "../dynamicNode";
import { AccountItemStatus, loadingIcon, m365Icon } from "./common";
import { SideloadingNode } from "./sideloadingNode";
import { CopilotNode } from "./copilotNode";

export class M365AccountNode extends DynamicNode {
  public status: AccountItemStatus;
  private sideloadingNode: SideloadingNode;
  private copilotNode: CopilotNode | undefined;

  constructor(private eventEmitter: vscode.EventEmitter<DynamicNode | undefined | void>) {
    super("", vscode.TreeItemCollapsibleState.None);
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinM365";
    this.sideloadingNode = new SideloadingNode(this.eventEmitter, "");
    if (isCopilotPluginEnabled()) {
      this.copilotNode = new CopilotNode(this.eventEmitter, "");
    }
  }

  public setSignedIn(upn: string) {
    if (this.status === AccountItemStatus.SignedIn) {
      return;
    }
    this.status = AccountItemStatus.SignedIn;
    this.label = upn;
    this.contextValue = "signedinM365";
    // refresh
    this.eventEmitter.fire(this);
  }

  public setSigningIn() {
    if (this.status === AccountItemStatus.SigningIn) {
      return;
    }
    this.status = AccountItemStatus.SigningIn;
    this.contextValue = "";
    // refresh
    this.eventEmitter.fire(this);
  }

  public setSignedOut() {
    if (this.status === AccountItemStatus.SignedOut) {
      return;
    }
    this.status = AccountItemStatus.SignedOut;
    this.contextValue = "signinM365";
    // refresh
    this.eventEmitter.fire(this);
  }

  public setSwitching() {
    if (this.status === AccountItemStatus.Switching) {
      return;
    }
    this.status = AccountItemStatus.Switching;
    this.contextValue = "";
    // refresh
    this.eventEmitter.fire(this);
  }

  public updateChecks(token: string, sideloading: boolean, copilot: boolean) {
    let refreshSideloading = false;
    let refreshCopilot = false;
    if (sideloading) {
      this.sideloadingNode.token = token;
      refreshSideloading = true;
    }
    if (isCopilotPluginEnabled() && copilot && this.copilotNode !== undefined) {
      this.copilotNode.token = token;
      refreshCopilot = true;
    }

    // partial refresh
    if (refreshSideloading && refreshCopilot) {
      this.eventEmitter.fire(this);
    } else if (refreshSideloading && !refreshCopilot) {
      this.eventEmitter.fire(this.sideloadingNode);
    } else if (!refreshSideloading && refreshCopilot) {
      this.eventEmitter.fire(this.copilotNode);
    }
  }

  public override getChildren(): vscode.ProviderResult<DynamicNode[]> {
    return isCopilotPluginEnabled() && this.copilotNode !== undefined
      ? [this.sideloadingNode, this.copilotNode]
      : [this.sideloadingNode];
  }

  public override getTreeItem(): vscode.TreeItem | Promise<vscode.TreeItem> {
    this.collapsibleState = vscode.TreeItemCollapsibleState.None;
    if (this.status !== AccountItemStatus.SignedIn) {
      this.label = localize("teamstoolkit.handlers.signIn365");
      this.command = {
        title: this.label,
        command: "fx-extension.signinM365",
        arguments: [TelemetryTriggerFrom.TreeView, this],
      };
    } else if (this.sideloadingNode.token !== "") {
      this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
    }
    this.tooltip = new vscode.MarkdownString(
      localize("teamstoolkit.accountTree.m365AccountTooltip")
    );
    if (
      this.status === AccountItemStatus.SigningIn ||
      this.status === AccountItemStatus.Switching
    ) {
      this.iconPath = loadingIcon;
      this.label =
        this.status === AccountItemStatus.Switching
          ? localize("teamstoolkit.accountTree.switchingM365")
          : localize("teamstoolkit.accountTree.signingInM365");
    } else {
      this.iconPath = m365Icon;
    }
    return this;
  }
}
