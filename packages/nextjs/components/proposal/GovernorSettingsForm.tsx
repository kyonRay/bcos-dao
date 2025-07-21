"use client";

import React, { useState } from "react";
import { Abi, AbiFunction } from "abitype";
import { Card, ConfigProvider, Form, Input, Select, Switch } from "antd";
import { ABIFunctionForm } from "~~/components/proposal/ABIFunctionForm";
import { IntegerInput } from "~~/components/scaffold-eth";
import { useDeployedContractInfo } from "~~/hooks/scaffold-eth";
import { GenericContract, InheritedFunctions } from "~~/utils/scaffold-eth/contract";

const governorSettings = [
  {
    label: <div className="text-base-content">DAO Settings</div>,
    title: "DAO Settings",
    options: [
      {
        label: <div>Proposal Threshold</div>,
        value: "setProposalThreshold",
      },
      {
        label: <div>Vote Success Threshold</div>,
        value: "setVoteSuccessThreshold",
      },
      {
        label: <div>Proposal Approval Threshold</div>,
        value: "setApproveThreshold",
      },
      {
        label: <div>Quorum Numerator</div>,
        value: "updateQuorumNumerator",
      },
      {
        label: <div>Voting Delay</div>,
        value: "setVotingDelay",
      },
      {
        label: <div>Voting Period</div>,
        value: "setVotingPeriod",
      },
      {
        label: <div>Timelock</div>,
        value: "updateTimelock",
      },
      {
        label: <div>Voting Success Logic</div>,
        value: "updateVoteSuccessLogic",
      },
      {
        label: <div>Upgrade DAO Contract</div>,
        value: "upgradeToAndCall",
      },
    ],
  },
  {
    label: <div className="text-base-content">DAO Role Changing</div>,
    title: "DAO Role Changing",
    options: [
      {
        label: <div>Grant Maintainer</div>,
        value: "grantMaintainer",
      },
      {
        label: <div>Revoke Maintainer</div>,
        value: "revokeMaintainer",
      },
    ],
  },
  {
    label: <div className="text-base-content">EVP Token Changing</div>,
    title: "EVP Token Changing",
    options: [
      {
        label: <div>Mint EVP Token</div>,
        value: "mintToken",
      },
      {
        label: <div>Burn EVP Token</div>,
        value: "burnToken",
      },
      {
        label: <div>Pause EVP Token</div>,
        value: "pauseToken",
      },
      {
        label: <div>Unpause EVP Token</div>,
        value: "unpauseToken",
      },
    ],
  },
  {
    label: <div className="text-base-content">Timer Unit Changing</div>,
    title: "Timer Unit Changing",
    options: [
      {
        label: <div>Reset Timer Unit</div>,
        value: "resetUint",
      },
    ],
  },
];

const GovernorSettingsForm = ({ field, index, onChange }: { field?: any; index?: any; onChange: any }) => {
  const parentForm = Form.useFormInstance();
  const FormItem = Form.Item;
  const [valueVisible, setValueVisible] = useState<boolean>(false);
  const [method, setMethod] = useState<{ fn: AbiFunction; inherited: string }>();
  const { data: deployedContractData, isLoading: deployedContractLoading } = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });

  const [govForm] = Form.useForm();

  if (deployedContractLoading) {
    return (
      <div className="mt-14">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }
  if (!deployedContractData) {
    return <p className="text-3xl mt-14">No contract found!</p>;
  }

  const handleChange = (value: string) => {
    const functionsToDisplay = (
      (deployedContractData.abi as Abi).filter(part => part.type === "function") as AbiFunction[]
    )
      .filter(fn => {
        return fn.stateMutability !== "view" && fn.stateMutability !== "pure" && fn.name === value;
      })
      .map(fn => {
        return {
          fn,
          inheritedFrom: ((deployedContractData as GenericContract)?.inheritedFunctions as InheritedFunctions)?.[
            fn.name
          ],
        };
      })
      .sort((a, b) => (b.inheritedFrom ? b.inheritedFrom.localeCompare(a.inheritedFrom) : 1));

    if (!functionsToDisplay.length) {
      return <>No write methods</>;
    }
    if (functionsToDisplay.length > 0) {
      setMethod({ fn: functionsToDisplay[0].fn, inherited: functionsToDisplay[0].inheritedFrom });
    }
  };
  return (
    <>
      <div className="mb-3">
        <Form
          layout={"vertical"}
          initialValues={{ address: deployedContractData.address }}
          form={govForm}
          onValuesChange={(e: any) => {
            console.log("onChange", e);
            onChange(govForm.getFieldsValue());
          }}
        >
          <FormItem
            name="address"
            label={<div className="text-lg font-bold mb-1 text-base-content">Target Contract Address</div>}
            rules={[{ required: true, message: "Please input the target contract address" }]}
          >
            <input
              className="text-base w-full h-12 rounded-xl bg-base-100 text-base-content p-4 border-2 border-base-300 focus:border-primary focus:outline-none"
              disabled
            ></input>
          </FormItem>
          <ConfigProvider
            theme={{
              components: {
                Select: {
                  colorText: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorBgElevated: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorTextPlaceholder: "var(--fallback-bc,oklch(var(--bc)/var(--tw-text-opacity, 1)))",
                  colorBorder: "var(--fallback-b3,oklch(var(--b3)/var(--tw-border-opacity, 1)))",
                  selectorBg: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))",
                  optionActiveBg: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))",
                  optionSelectedBg: "var(--fallback-b3,oklch(var(--b3)/var(--tw-border-opacity, 1)))",
                },
              },
            }}
          >
            <FormItem
              name="method"
              label={<div className="text-lg font-bold mb-1 text-base-content">Contract Method</div>}
              rules={[{ required: true, message: "Please input the method address" }]}
            >
              <Select
                options={governorSettings}
                dropdownStyle={{ backgroundColor: "var(--fallback-b1,oklch(var(--b1)/var(--tw-bg-opacity, 1)))" }}
                onSelect={handleChange}
                className="!h-12"
              ></Select>
            </FormItem>
          </ConfigProvider>

          {method && (
            <FormItem label={<div className="text-lg font-bold mb-1 text-base-content">Method arguments</div>}>
              <div>
                {deployedContractData && method && (
                  <ABIFunctionForm
                    abi={deployedContractData.abi as Abi}
                    abiFunction={method.fn as AbiFunction}
                    onChange={(encodeData: string) => {
                      console.log(encodeData);
                      parentForm.setFieldValue(["actions", index, "calldata"], encodeData);
                    }}
                    inheritedFrom={method.inherited}
                  />
                )}
              </div>
            </FormItem>
          )}

          {method && (
            <div className="mb-4 inline-flex gap-2 text-base-content">
              <div>Also send TOKEN to the target address? (this is not common)</div>
              <Switch
                onChange={() => {
                  setValueVisible(!valueVisible);
                  govForm.setFieldValue("value", "0");
                  parentForm.setFieldValue(["actions", index, "value"], "0");
                }}
              ></Switch>
            </div>
          )}

          {valueVisible && (
            <FormItem name="value" label={<div className="text-lg font-bold mb-1 text-base-content">Value</div>}>
              <input
                className="text-base w-full h-12 rounded-xl bg-base-100 text-base-content/70 p-4 border-2 border-base-300 focus:border-primary focus:outline-none"
                placeholder={
                  "The amount of Balance you wish to send the target address (External Account or Smart Contract)"
                }
              ></input>
            </FormItem>
          )}
        </Form>
      </div>
    </>
  );
};

export default GovernorSettingsForm;
