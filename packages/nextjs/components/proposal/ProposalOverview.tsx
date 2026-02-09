import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { LinkOutlined } from "@ant-design/icons";
import { codeBlockPlugin, headingsPlugin, linkPlugin, listsPlugin, quotePlugin } from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { CopyIcon } from "@radix-ui/react-icons";
import { Button, Popover, Space, Table } from "antd";
import { message } from "antd";
import classNames from "classnames";
import { useTheme } from "next-themes";
import { tryToDecodeData } from "~~/hooks/blockchain/ABIDecode";
import { type ProposalAllInfo, decodeData } from "~~/hooks/blockchain/BCOSGovernor";
import { useTransactionsByAddress, useTransactionsFilterByTo } from "~~/hooks/blockchain/useTransactionByAddress";
import { useDeployedContractInfo, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { ProposalState, stateColorsClassName } from "~~/services/store/store";
import { formatDuration, formatUTCDate } from "~~/utils/TimeFormatter";
import { formatToken } from "~~/utils/TokenFormatter";
import { shortenAddress } from "~~/utils/scaffold-eth/common";

const MDXEditor = dynamic(() => import("@mdxeditor/editor").then(mod => mod.MDXEditor), { ssr: false });

interface ProposalOverviewProps {
  proposal: ProposalAllInfo;
  isPreview?: boolean;
}

export const ProposalOverview = ({ proposal, isPreview = false }: ProposalOverviewProps) => {
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success("Copied to clipboard");
    } catch (err) {
      message.error("Failed to copy");
    }
  };
  const bcosGovernor = useDeployedContractInfo({
    contractName: "BCOSGovernor",
  });
  const stateColor = stateColorsClassName[Number(proposal.state)];
  const [timeRange, setTimeRange] = useState<string>();
  const [etaTime, setEtaTime] = useState<string>();
  const [timeSuffix, setTimeSuffix] = useState<string>("");
  const [txSubmitProposalHash, setTxSubmitProposalHash] = useState<string>();
  const [txExecutedProposalHash, setTxExecutedProposalHash] = useState<string>();
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const [showDescriptionToggle, setShowDescriptionToggle] = useState(false);
  const txsByProposer = useTransactionsByAddress(proposal.createBlock, proposal.proposer);
  const executedTx = useTransactionsFilterByTo(proposal.executedBlock, bcosGovernor.data?.address);
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (proposal.startTime && proposal.endTime) {
      const startTimeString = formatUTCDate(proposal.startTime * 1000);
      const endTimeString = formatUTCDate(proposal.endTime * 1000);
      setTimeRange(`${startTimeString} - ${endTimeString}`);
    }
  }, [proposal.startTime, proposal.endTime]);

  useEffect(() => {
    if (proposal.eta && proposal.eta !== 0) {
      const etaString = formatUTCDate(proposal.eta * 1000);
      const eta = new Date(proposal.eta * 1000);
      const now = new Date();
      let timeSuffix = "";
      let diffDate;
      if (now < eta) {
        diffDate = new Date(eta.getTime() - now.getTime());
        console.log("diffDate", diffDate);
        /// FIXME)): this diff date will be error in 1 day
        timeSuffix = " (ends in " + formatDuration(diffDate.getTime() / 1000) + ")";
      } else {
        // eta <= now
        timeSuffix = " (Ready to go!)";
      }
      if (proposal.executedBlock > 0) {
        timeSuffix = " (Executed in block #" + proposal.executedBlock + ")";
      }
      setEtaTime(etaString);
      setTimeSuffix(timeSuffix);
    }
  }, [proposal.eta, proposal.executedBlock]);

  useEffect(() => {
    if (txsByProposer && bcosGovernor) {
      console.log("txsByProposer", txsByProposer);
      const txhash = txsByProposer.filter(tx => {
        if (tx.to !== bcosGovernor.data?.address) {
          return false;
        }
        const txData = decodeData(tx.input, bcosGovernor.data?.abi);
        return txData?.functionName === "proposeWithTitle";
      });
      if (txhash.length === 1) {
        setTxSubmitProposalHash(txhash[0].hash);
      }
    }
  }, [txsByProposer]);

  useEffect(() => {
    if (executedTx && bcosGovernor) {
      console.log("executedTx", executedTx);
      const txhash = executedTx.filter(tx => {
        if (tx.to !== bcosGovernor.data?.address) {
          return false;
        }
        const txData = decodeData(tx.input, bcosGovernor.data?.abi);
        return (
          txData?.functionName === "executeById" &&
          txData.args?.find(value => {
            return value === BigInt(proposal.id);
          })
        );
      });
      if (txhash.length === 1) {
        setTxExecutedProposalHash(txhash[0].hash);
      }
    }
  }, [executedTx]);

  const descriptionCollapsedHeight = 200;
  useEffect(() => {
    if (!descriptionRef.current || descriptionExpanded) return;
    const el = descriptionRef.current;
    const check = () => {
      setShowDescriptionToggle(el.scrollHeight > descriptionCollapsedHeight);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [proposal.description, descriptionExpanded]);

  const { targetNetwork } = useTargetNetwork();
  const blockExplorerBaseURL = targetNetwork.blockExplorers?.default?.url;
  const isDarkMode = resolvedTheme === "dark";

  return (
    <div className="bg-base-200 rounded-xl shadow-lg">
      {/*Header*/}
      {!isPreview &&
        (isDarkMode ? (
          <div
            className={classNames(
              "flex rounded-t-xl justify-between items-center p-4",
              `bg-base-300/50`,
              `text-${stateColor}-800`,
            )}
          >
            <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-${stateColor}-400`}>
              {ProposalState[Number(proposal.state)]}
            </span>
            <span className="text-lg font-bold text-white">No. {proposal.id}</span>
          </div>
        ) : (
          <div
            className={classNames(
              "flex rounded-t-xl justify-between items-center p-4",
              `bg-${stateColor}-200`,
              `text-${stateColor}-800`,
            )}
          >
            <span className={`px-3 py-1 text-sm font-semibold rounded-full bg-white`}>
              {ProposalState[Number(proposal.state)]}
            </span>
            <span className="text-lg font-bold text-white">No. {proposal.id}</span>
          </div>
        ))}
      {/*Body*/}
      <div className="p-6">
        {/* Title: always show; in preview show as "Proposal title" + title */}
        <div className="mb-8">
          {isPreview ? (
            <>
              <h2 className="text-xl font-bold text-base-content mb-2">Proposal title</h2>
              <h1 className="text-2xl font-bold text-base-content break-words">{proposal.title || "(No title)"}</h1>
            </>
          ) : (
            <Popover content={proposal.title} trigger="hover" placement="topLeft" overlayStyle={{ maxWidth: "50%" }}>
              <h1 className={`text-2xl font-bold text-base-content truncate cursor-pointer w-[calc(100%-100px)]`}>
                {proposal.title}
              </h1>
            </Popover>
          )}

          {/* Voting Period, Proposer, tx links: only for submitted proposals, not preview */}
          {!isPreview && (
            <div className="grid grid-cols-2 gap-6 mt-6">
              {etaTime !== undefined ? (
                <div>
                  <h2 className="text-xl font-bold text-base-content">Executable Time</h2>
                  <div className="flex justify-start">
                    <Space>
                      <p className="text-md font-medium text-base-content">{etaTime}</p>
                      <p className="text-md text-emerald-500">{timeSuffix}</p>
                    </Space>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-xl font-bold text-base-content">Voting Period</h2>
                  <p className="text-md font-medium text-base-content">{timeRange}</p>
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold text-base-content">Proposer</h2>
                <Link
                  href={`${blockExplorerBaseURL}/address/${proposal.proposer}`}
                  className="text-md font-medium text-primary"
                  target="_blank"
                >
                  <LinkOutlined />
                  {shortenAddress(proposal.proposer)}
                </Link>
              </div>

              {txSubmitProposalHash && (
                <div>
                  <h2 className="text-xl font-bold text-base-content">Submit Proposal Transaction</h2>
                  <Link
                    href={`${blockExplorerBaseURL}/tx/${txSubmitProposalHash}`}
                    className="text-md font-medium text-primary"
                    target={`_blank`}
                  >
                    <LinkOutlined />
                    View on Explorer →
                  </Link>
                </div>
              )}

              {txExecutedProposalHash && (
                <div>
                  <h2 className="text-xl font-bold text-base-content">Executed Transaction</h2>
                  <Link
                    href={`${blockExplorerBaseURL}/tx/${txExecutedProposalHash}`}
                    className="text-md font-medium text-primary"
                    target={`_blank`}
                  >
                    <LinkOutlined />
                    View on Explorer →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-base-content mb-4">Actions</h2>
          <div className="overflow-x-auto">
            <Table
              dataSource={proposal.targets.map((target, index) => ({
                key: index,
                value: proposal.values[index],
                address: target,
                calldata: proposal.calldatas[index],
                func: (() => {
                  const decodedData = tryToDecodeData(proposal.calldatas[index] as `0x{string}`, target);
                  if (decodedData) {
                    console.log("decodedData", decodedData);
                    return <div className="font-bold text-sm"> {decodedData.functionName}</div>;
                  } else {
                    return undefined;
                  }
                })(),
                functionArgs: (() => {
                  const decodedData = tryToDecodeData(proposal.calldatas[index] as `0x{string}`, target);
                  if (decodedData && decodedData.args) {
                    return decodedData.args.map(arg => {
                      if (typeof arg === "bigint") {
                        return arg.toString();
                      }
                      if (typeof arg === "boolean") {
                        return arg ? "true" : "false";
                      }
                      return arg;
                    });
                  } else {
                    return [];
                  }
                })(),
              }))}
              pagination={false}
              columns={[
                {
                  title: "Address",
                  dataIndex: "address",
                  key: "address",
                  width: "25%",
                  render: (address: string) => (
                    <Link
                      href={`${blockExplorerBaseURL}/address/${address}`}
                      className="text-md font-medium text-primary"
                      target="_blank"
                    >
                      <LinkOutlined />
                      {shortenAddress(address)}
                    </Link>
                  ),
                },
                {
                  title: "Value",
                  dataIndex: "value",
                  key: "value",
                  width: "15%",
                  render: (value: any) => (
                    <span className="text-md font-medium">{formatToken(value).toFixed(4)} POT</span>
                  ),
                },
                {
                  title: "Function",
                  dataIndex: "func",
                  key: "func",
                  width: "40%",
                  render: (func: any, record: any) =>
                    func ? (
                      func
                    ) : record.calldata ? (
                      <div className="flex items-center">
                        <span className="font-bold text-sm truncate max-w-xs inline-block" title={record.calldata}>
                          {record.calldata}
                        </span>
                        <Button
                          size={"small"}
                          type={"link"}
                          onClick={e => {
                            e.stopPropagation();
                            copyToClipboard(record.calldata).then();
                          }}
                          icon={<CopyIcon />}
                        ></Button>
                      </div>
                    ) : (
                      <span className="text-sm">Cannot decode function data</span>
                    ),
                },
                Table.EXPAND_COLUMN,
              ]}
              expandable={{
                columnTitle: "Function Args",
                expandedRowRender: record =>
                  record.func ? (
                    <div className="flex flex-col">
                      {record.functionArgs.map((arg: any, index: any) => (
                        <div key={index} className="flex items-center">
                          <span className="text-md font-medium mr-2">Arg {index + 1}:</span>
                          <span className="text-md">{arg as string}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div />
                  ),
                expandIcon: ({ expanded, onExpand, record }) => (
                  <span
                    className={classNames("cursor-pointer", expanded ? "text-primary" : "text-gray-900")}
                    onClick={e => {
                      e.stopPropagation();
                      onExpand(record, e);
                    }}
                  >
                    {record.functionArgs.length +
                      (record.functionArgs.length === 1 ? " Argument " : " Arguments ") +
                      (expanded ? "▲" : "▼")}
                  </span>
                ),
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-xl font-bold text-base-content mb-4">Description</h2>
          <div
            ref={descriptionRef}
            className="relative prose max-w-none bg-base-100 p-4 rounded-lg text-base-content overflow-hidden transition-[max-height] duration-300"
            style={{
              maxHeight: descriptionExpanded ? undefined : descriptionCollapsedHeight,
            }}
          >
            {typeof window !== "undefined" && (
              <MDXEditor
                markdown={
                  typeof proposal.description === "string" ? proposal.description : String(proposal.description ?? "")
                }
                readOnly
                contentEditableClassName="!bg-transparent !text-base-content"
                plugins={[linkPlugin(), listsPlugin(), quotePlugin(), headingsPlugin(), codeBlockPlugin()]}
              />
            )}
            {/* Frosted overlay when collapsed to suggest more content */}
            {showDescriptionToggle && !descriptionExpanded && (
              <div
                className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-lg bg-gradient-to-t from-base-100 via-base-100/85 to-transparent backdrop-blur-[3px]"
                aria-hidden
              />
            )}
          </div>
          {showDescriptionToggle && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => setDescriptionExpanded(e => !e)}
                className="text-sm font-medium text-primary inline-flex items-center gap-1"
              >
                <div className="underline">{descriptionExpanded ? "less" : "more"}</div>
                <span
                  className={classNames("inline-block transition-transform", descriptionExpanded && "rotate-180")}
                  aria-hidden
                >
                  ▼
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
