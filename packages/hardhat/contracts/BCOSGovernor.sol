// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import { IGovernor, Governor } from "@openzeppelin/contracts/governance/Governor.sol";
import { GovernorVotes } from "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import { GovernorTimelockControl } from "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";
import { GovernorStorage } from "@openzeppelin/contracts/governance/extensions/GovernorStorage.sol";
import { TimelockController } from "@openzeppelin/contracts/governance/TimelockController.sol";
import { IVotes } from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";
import { IAccessControl, AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import "./DAOSettings.sol";

contract BCOSGovernor is
    GovernorVotes,
    GovernorTimelockControl,
    GovernorStorage,
    DAOSettings,
    AccessControl,
    UUPSUpgradeable
{
    enum VoteType {
        Against,
        For,
        Abstain
    }

    bytes32 public constant MAINTAINER_ROLE = keccak256("MAINTAINER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    constructor(
        IVotes _token,
        TimelockController _timelock
    )
        Governor("BCOSGovernor")
        GovernorVotes(_token)
        DAOSettings(30, 1000, 1000, 1000)
        GovernorTimelockControl(_timelock)
    {
        _grantRole(MAINTAINER_ROLE, msg.sender);
        _grantRole(EXECUTOR_ROLE, msg.sender);
    }

    struct ProposalApprovalFlow {
        address[] approvers;
        bool approved;
    }

    modifier onlyMaintainer() {
        require(hasRole(MAINTAINER_ROLE, _msgSender()), "BCOSGovernor: caller is not a maintainer");
        _;
    }

    mapping(uint256 proposalHash => uint256 proposalId) private _proposalIds;
    uint256 private _latestProposalId;
    mapping(uint256 proposalId => ProposalVote) private _proposalVotes;
    mapping(uint256 proposalId => ProposalApprovalFlow) private _proposalApprovalFlow;

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=bravo&quorum=for,against,abstain";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(Governor, AccessControl) returns (bool) {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            interfaceId == type(IGovernor).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function getProposalId(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public view virtual override returns (uint256) {
        uint256 proposalHash = hashProposal(targets, values, calldatas, descriptionHash);
        uint256 storedProposalId = _proposalIds[proposalHash];
        if (storedProposalId == 0) {
            revert GovernorNonexistentProposal(0);
        }
        return storedProposalId;
    }

    /**
 * @dev Returns the latest proposal id. A return value of 0 means no proposals have been created yet.
     */
    function latestProposalId() public view virtual returns (uint256) {
        return _latestProposalId;
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        return _proposalVotes[proposalId].hasVoted[account];
    }

    /**
     * @dev Accessor to the internal vote counts.
     */
    function proposalVotes(
        uint256 proposalId
    ) public view virtual returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return (proposalVote.againstVotes, proposalVote.forVotes, proposalVote.abstainVotes);
    }

    function proposalThreshold() public view override(DAOSettings, Governor) returns (uint256) {
        return super.proposalThreshold();
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    function _quorumReached(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        return
            quorum(proposalSnapshot(proposalId)) <=
            (proposalVote.forVotes + proposalVote.againstVotes + proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    function _voteSucceeded(uint256 proposalId) internal view virtual override returns (bool) {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];
        return isVoteSuccessful(proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalId,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override {
        ProposalVote storage proposalVote = _proposalVotes[proposalId];

        if (proposalVote.hasVoted[account]) {
            revert GovernorAlreadyCastVote(account);
        }
        proposalVote.hasVoted[account] = true;

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert GovernorInvalidVoteType();
        }
    }

    function approveProposal(uint256 proposalId) public onlyMaintainer {
        ProposalState proposalState = state(proposalId);
        if (proposalState != ProposalState.Pending) {
            revert GovernorUnexpectedProposalState(
                proposalId,
                proposalState,
                _encodeStateBitmap(ProposalState.Pending)
            );
        }
        ProposalApprovalFlow storage approvalFlow = _proposalApprovalFlow[proposalId];
        approvalFlow.approvers.push(_msgSender());
        if (approvalFlow.approvers.length >= proposalThreshold()) {
            approvalFlow.approved = true;
        }
    }

    function state(
        uint256 proposalId
    ) public view virtual override(Governor, GovernorTimelockControl) returns (ProposalState) {
        ProposalState proposalState = super.state(proposalId);
        if (proposalState == ProposalState.Active) {
            ProposalApprovalFlow storage approvalFlow = _proposalApprovalFlow[proposalId];
            if (!approvalFlow.approved) {
                return ProposalState.Pending;
            }
        }
        return proposalState;
    }

    function _executor() internal view override(Governor, GovernorTimelockControl) returns (address) {
        return super._executor();
    }

    function _propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address proposer
    ) internal override(Governor, GovernorStorage) returns (uint256) {
        uint256 proposalHash = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        uint256 storedProposalId = _proposalIds[proposalHash];
        if (storedProposalId == 0) {
            _proposalIds[proposalHash] = ++_latestProposalId;
        }
        return super._propose(targets, values, calldatas, description, proposer);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function execute(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public payable override onlyMaintainer returns (uint256) {
        return super.execute(targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) public virtual override(Governor) returns (uint256) {
        // The proposalId will be recomputed in the `_cancel` call further down. However we need the value before we
        // do the internal call, because we need to check the proposal state BEFORE the internal `_cancel` call
        // changes it. The `hashProposal` duplication has a cost that is limited, and that we accept.
        uint256 proposalId = hashProposal(targets, values, calldatas, descriptionHash);

        // public cancel restrictions (on top of existing _cancel restrictions).
        ProposalState currentState = state(proposalId);
        if (currentState == ProposalState.Pending) {
            if (_msgSender() != proposalProposer(proposalId) && !hasRole(MAINTAINER_ROLE, _msgSender())) {
                revert GovernorOnlyProposer(_msgSender());
            }
        } else if (currentState == ProposalState.Active) {
            if (!hasRole(MAINTAINER_ROLE, _msgSender())) {
                revert GovernorOnlyExecutor(_msgSender());
            }
        } else {
            bytes32 allowedStates = _encodeStateBitmap(ProposalState.Pending) |
                _encodeStateBitmap(ProposalState.Active);
            revert GovernorUnexpectedProposalState(proposalId, currentState, allowedStates);
        }

        return _cancel(targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(Governor, GovernorTimelockControl) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function grantRole(bytes32 role, address account) public override onlyGovernance {
        super.grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyGovernance {
        super.revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public override onlyGovernance {
        super.renounceRole(role, account);
    }

    function proposalNeedsQueuing(
        uint256 /*proposalId*/
    ) public view virtual override(Governor, GovernorTimelockControl) returns (bool) {
        return true;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyGovernance {}
}
