// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.26;

import {GovernorUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/GovernorUpgradeable.sol";
import {GovernorVotesUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorVotesUpgradeable.sol";
import {GovernorTimelockControlUpgradeable} from "./GovernorTimelockControlUpgradeable.sol";
import {GovernorStorageUpgradeable} from "@openzeppelin/contracts-upgradeable/governance/extensions/GovernorStorageUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./DAOSettings.sol";
import "./ERC20VotePower.sol";

import "./CustomTimelockControllerUpgradeable.sol";

    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.UintSet;

    struct ProposalVoteCore {
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
    }

    struct ProposalVote {
        uint256 againstVotes;
        uint256 forVotes;
        uint256 abstainVotes;
        EnumerableSet.AddressSet voters;
        mapping(address voter => uint256) hasVoted;
        mapping(address voter => uint8) voteType;
        mapping(address voter => uint256) voteBlock;
    }

contract BCOSGovernor is
GovernorVotesUpgradeable,
GovernorTimelockControlUpgradeable,
GovernorStorageUpgradeable,
DAOSettings,
AccessControlUpgradeable,
UUPSUpgradeable
{
    struct ProposalExtraStorage {
        string title;
        string description;
        uint256 createBlockNumber;
        uint256 executedBlockNumber;
        uint256 canceledBlockNumber;
    }

    struct ProposalInfo {
        uint256 proposalId;
        address proposer;
        ProposalState proposalState;
        ProposalDetails proposalDetail;
        ProposalVoteCore proposalVote;
        uint256 startTime;
        uint256 endTime;
        uint256 eta;
        ProposalExtraStorage extra;
    }
    enum VoteType {
        Against,
        For,
        Abstain
    }
    struct ProposalApprovalFlow {
        EnumerableSet.AddressSet approvers;
        bool approved;
    }

    // keccak256("MAINTAINER_ROLE");
    bytes32 public constant MAINTAINER_ROLE = 0x339759585899103d2ace64958e37e18ccb0504652c81d4a1b8aa80fe2126ab95;
    // keccak256("EXECUTOR_ROLE");
    bytes32 public constant EXECUTOR_ROLE = 0xd8aa0f3194971a2a116679f7c2090f6939c8d4e01a2a8d7e41d55e5351469e63;

    function initialize(
        ERC20VotePower _token,
        CustomTimelockControllerUpgradeable _timelock,
        uint256 _quorumNumeratorValue,
        uint48 _initialVotingDelay,
        uint32 _initialVotingPeriod,
        uint256 _initialProposalThreshold,
        uint256 _minDelay,
        uint256 _initTokenPool,
        TimeSetting _timer,
        uint256 _unit
    ) public initializer {
        _timer.initialize(_unit);
        _token.initialize("ERC20Vote", "EVP", _timer);
        __Governor_init("BCOSGovernor");
        __GovernorVotes_init(_token);
        __GovernorTimelockControl_init(_timelock);
        __DAOSettings_init(_quorumNumeratorValue, _initialVotingDelay, _initialVotingPeriod, _initialProposalThreshold);

        _timelock.initialize(_minDelay, address(this), address(this), _msgSender(), _timer);
        _grantRole(MAINTAINER_ROLE, _msgSender());
        _token.mint(address(_timelock), _initTokenPool - _initialProposalThreshold);
        _token.mint(_msgSender(), _initialProposalThreshold);
    }

    modifier onlyMaintainer() {
        require(hasRole(MAINTAINER_ROLE, _msgSender()), "BCOSGovernor: caller is not a maintainer");
        _;
    }

    struct BCOSGovernorStorage {
        // for proposal storage and index
        mapping(uint256 proposalHash => uint256 proposalId) _proposalIds;
        mapping(uint256 proposalId => uint256 proposalHash) _proposalHashes;
        mapping(uint256 proposalId => ProposalExtraStorage) _proposalExtra;
        // proposalId => vote
        mapping(uint256 proposalId => ProposalVote) _proposalVotes;
        // proposalId => approval
        mapping(uint256 proposalId => ProposalApprovalFlow) _proposalApprovalFlow;
        // only save the final status proposal
        EnumerableSet.UintSet canceledProposals;
        EnumerableSet.UintSet executedProposals;
    }

    // keccak256(abi.encode(uint256(keccak256("bcos-dao.contracts.BCOSGovernorStorage")) - 1)) & ~bytes32(uint256(0xff));
    bytes32 private constant BCOS_GOVERNOR_STORAGE_POSITION =
    0xea816ad03356230ef5ef5fd2e2bd3bec292a96e42e2c6aafb1da0b68271da000;

    function _getBCOSGovernorStorage() private pure returns (BCOSGovernorStorage storage $) {
        assembly {
            $.slot := BCOS_GOVERNOR_STORAGE_POSITION
        }
    }

    /**
     * @dev See {IGovernor-COUNTING_MODE}.
     */
    // solhint-disable-next-line func-name-mixedcase
    function COUNTING_MODE() public pure virtual override returns (string memory) {
        return "support=bravo&quorum=for,against,abstain";
    }

    function executor() public view returns (address) {
        return _executor();
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(GovernorUpgradeable, AccessControlUpgradeable) returns (bool) {
        return
            interfaceId == type(AccessControlUpgradeable).interfaceId ||
            interfaceId == type(GovernorUpgradeable).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    function getProposalHashById(uint256 proposalId) public view returns (uint256) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 storedProposalHash = $._proposalHashes[proposalId];
        if (storedProposalHash == 0) {
            revert GovernorNonexistentProposal(proposalId);
        }
        return storedProposalHash;
    }

    function getProposalApprovalFlow(
        uint256 proposalId
    ) public view returns (address[] memory approvers, bool approved) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        approvers = $._proposalApprovalFlow[proposalId].approvers.values();
        approved = $._proposalApprovalFlow[proposalId].approved;
    }

    function getProposalAllInfo(uint256 proposalId) public view returns (ProposalInfo memory info) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        (
            info.proposalDetail.targets,
            info.proposalDetail.values,
            info.proposalDetail.calldatas,
            info.proposalDetail.descriptionHash
        ) = proposalDetails(proposalHash);
        info.proposalId = proposalId;
        info.proposalState = state(proposalHash);
        info.proposalId = proposalId;
        (info.proposalVote.forVotes, info.proposalVote.againstVotes, info.proposalVote.abstainVotes) = proposalVotes(
            proposalId
        );
        info.startTime = proposalSnapshot(proposalHash);
        info.endTime = proposalDeadline(proposalHash);
        info.eta = proposalEta(proposalHash);
        info.proposer = proposalProposer(proposalHash);
        info.extra = $._proposalExtra[proposalId];
    }

    function getProposalInfoPage(
        uint256 offset,
        uint256 pageSize
    ) public view returns (ProposalInfo[] memory infoList) {
        uint256 latestIndex = proposalCount();
        if (offset >= latestIndex) {
            return infoList;
        }
        uint256 end = offset + pageSize;
        if (end > latestIndex) {
            end = latestIndex;
        }
        infoList = new ProposalInfo[](end - offset);
        for (uint256 i = 0; i < (end - offset); i++) {
            infoList[i] = getProposalAllInfo(i + offset + 1);
        }
    }

    /**
     * @dev See {IGovernor-hasVoted}.
     */
    function hasVoted(uint256 proposalId, address account) public view virtual override returns (bool) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        return $._proposalVotes[proposalId].hasVoted[account] > 0;
    }

    /**
     * @dev Accessor to the internal vote counts.
     */
    function proposalVotes(
        uint256 proposalId
    ) public view virtual returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];
        return (proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes);
    }

    function proposalVoters(uint256 proposalId) public view returns (address[] memory) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];
        return proposalVote.voters.values();
    }

    function proposalVoterInfo(
        uint256 proposalId,
        address voter
    ) public view returns (uint256 weight, uint8 voteType, uint256 number) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];
        weight = proposalVote.hasVoted[voter];
        voteType = proposalVote.voteType[voter];
        number = proposalVote.voteBlock[voter];
    }

    function proposalThreshold() public view override(DAOSettings, GovernorUpgradeable) returns (uint256) {
        return super.proposalThreshold();
    }

    function stateById(uint256 proposalId) public view virtual returns (ProposalState) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        return state(proposalHash);
    }

    function state(
        uint256 proposalHash
    ) public view virtual override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (ProposalState) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalId = $._proposalIds[proposalHash];
        ProposalState proposalState = super.state(proposalHash);
        if (proposalState == ProposalState.Pending) {
            // turn into active status when approved immediately
            ProposalApprovalFlow storage approvalFlow = $._proposalApprovalFlow[proposalId];
            if (approvalFlow.approved) {
                return ProposalState.Active;
            }
        }
        if (proposalState == ProposalState.Active) {
            ProposalApprovalFlow storage approvalFlow = $._proposalApprovalFlow[proposalId];
            if (!approvalFlow.approved) {
                return ProposalState.Pending;
            }
            // turn into succeeeded status if quorum reached and vote succeeded
            if (!_quorumReached(proposalHash) || !_voteSucceeded(proposalHash)) {
                return ProposalState.Active;
            } else if (proposalEta(proposalHash) == 0) {
                return ProposalState.Succeeded;
            } else {
                return ProposalState.Queued;
            }
        }
        return proposalState;
    }

    function proposalNeedsQueuing(
        uint256 /*proposalId*/
    ) public view virtual override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (bool) {
        return true;
    }

    function getCancelledProposals() public view returns (uint256[] memory) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        return $.canceledProposals.values();
    }

    function getExecutedProposals() public view returns (uint256[] memory) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        return $.executedProposals.values();
    }

    /***************************
     * DAO procedure functions
     ****************************/

    function proposeWithTitle(
        string memory title,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256) {
        uint proposalHash = super.propose(targets, values, calldatas, description);
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        ProposalExtraStorage storage extra = $._proposalExtra[proposalCount()];
        extra.createBlockNumber = block.number;
        extra.title = title;
        extra.description = description;
        return proposalHash;
    }

    function approveProposal(uint256 proposalId) public onlyMaintainer {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        ProposalState proposalState = state(proposalHash);
        if (proposalState != ProposalState.Pending) {
            revert GovernorUnexpectedProposalState(
                proposalId,
                proposalState,
                _encodeStateBitmap(ProposalState.Pending)
            );
        }
        ProposalApprovalFlow storage approvalFlow = $._proposalApprovalFlow[proposalId];
        approvalFlow.approvers.add(_msgSender());
        if (approvalFlow.approvers.length() >= approveThreshold()) {
            approvalFlow.approved = true;
        }
    }

    function vote(uint256 proposalId, uint8 support, string calldata reason) public returns (uint256) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        return super.castVoteWithReason(proposalHash, support, reason);
    }

    function queueById(uint256 proposalId) public {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        super.queue(proposalHash);
    }

    function executeById(uint256 proposalId) public payable onlyMaintainer {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        super.execute(proposalHash);
        ProposalExtraStorage storage extra = $._proposalExtra[proposalId];
        extra.executedBlockNumber = block.number;
        extra.canceledBlockNumber = 0;
        $.executedProposals.add(proposalId);
    }

    function emergencyShutdownProposal(uint256 proposalId) public onlyMaintainer {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        ProposalState proposalState = state(proposalHash);
        _validateStateBitmap(proposalHash, _encodeStateBitmap(ProposalState.Active) | _encodeStateBitmap(ProposalState.Queued));
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory calldatas,
            bytes32 descriptionHash
        ) = proposalDetails(proposalHash);
        _cancel(targets, values, calldatas, descriptionHash);
        $.canceledProposals.add(proposalId);
    }

    function cancelById(uint256 proposalId) public onlyMaintainer {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalHash = $._proposalHashes[proposalId];
        super.cancel(proposalHash);
        ProposalExtraStorage storage extra = $._proposalExtra[proposalId];
        extra.canceledBlockNumber = block.number;
        extra.executedBlockNumber = 0;
        $.canceledProposals.add(proposalId);
    }

    /***************************
     * role change functions
     ****************************/

    function grantMaintainer(address account) public onlyGovernance {
        _grantRole(MAINTAINER_ROLE, account);
    }

    function revokeMaintainer(address account) public onlyGovernance {
        _revokeRole(MAINTAINER_ROLE, account);
    }

    function grantRole(bytes32 role, address account) public override onlyGovernance {
        _grantRole(role, account);
    }

    function revokeRole(bytes32 role, address account) public override onlyGovernance {
        _revokeRole(role, account);
    }

    function renounceRole(bytes32 role, address account) public override onlyGovernance {}

    /***************************
     * vote power token change functions
     ****************************/

    function mintToken(address account, uint256 amount) public onlyGovernance {
        ERC20VotePower token = ERC20VotePower(address(token()));
        token.mint(account, amount);
    }

    function burnToken(address account, uint256 amount) public onlyGovernance {
        ERC20VotePower token = ERC20VotePower(address(token()));
        token.burn(account, amount);
    }

    function pauseToken() public onlyGovernance {
        ERC20VotePower token = ERC20VotePower(address(token()));
        token.pause();
    }

    function unpauseToken() public onlyGovernance {
        ERC20VotePower token = ERC20VotePower(address(token()));
        token.unpause();
    }

    /***************************
     * timer functions
     ****************************/

    function resetUint(uint256 _unit) public onlyGovernance {
        uint256 finalStateProposal = getExecutedProposals().length + getCancelledProposals().length;
        require(finalStateProposal + 1 == proposalCount(), "BCOSGovernor: not all proposals are finalized");
        ERC20VotePower token = ERC20VotePower(address(token()));
        TimeSetting t = token.timer();
        t.resetUnit(_unit);
    }

    /***************************
     * internal functions
     ****************************/

    function _propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description,
        address proposer
    ) internal override(GovernorUpgradeable, GovernorStorageUpgradeable) returns (uint256 proposalId) {
        proposalId = super._propose(targets, values, calldatas, description, proposer);
        uint256 proposalHash = hashProposal(targets, values, calldatas, keccak256(bytes(description)));
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 storedProposalId = $._proposalIds[proposalHash];
        if (storedProposalId == 0) {
            uint256 id = proposalCount();
            $._proposalIds[proposalHash] = id;
            $._proposalHashes[id] = proposalHash;
        }
    }

    /**
     * @dev See {Governor-_quorumReached}.
     */
    function _quorumReached(uint256 proposalHash) internal view virtual override returns (bool) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalId = $._proposalIds[proposalHash];
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];

        return
            quorum(proposalSnapshot(proposalHash)) <=
            (proposalVote.forVotes + proposalVote.againstVotes + proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_voteSucceeded}. In this module, the forVotes must be strictly over the againstVotes.
     */
    function _voteSucceeded(uint256 proposalHash) internal view virtual override returns (bool) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalId = $._proposalIds[proposalHash];
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];
        return isVoteSuccessful(proposalVote.forVotes, proposalVote.againstVotes, proposalVote.abstainVotes);
    }

    /**
     * @dev See {Governor-_countVote}. In this module, the support follows the `VoteType` enum (from Governor Bravo).
     */
    function _countVote(
        uint256 proposalHash,
        address account,
        uint8 support,
        uint256 weight,
        bytes memory // params
    ) internal virtual override returns (uint256) {
        BCOSGovernorStorage storage $ = _getBCOSGovernorStorage();
        uint256 proposalId = $._proposalIds[proposalHash];
        ProposalVote storage proposalVote = $._proposalVotes[proposalId];

        if (weight == 0) {
            revert GovernorInvalidVoteType();
        }
        if (proposalVote.hasVoted[account] > 0) {
            revert GovernorAlreadyCastVote(account);
        }

        if (support == uint8(VoteType.Against)) {
            proposalVote.againstVotes += weight;
        } else if (support == uint8(VoteType.For)) {
            proposalVote.forVotes += weight;
        } else if (support == uint8(VoteType.Abstain)) {
            proposalVote.abstainVotes += weight;
        } else {
            revert GovernorInvalidVoteType();
        }
        proposalVote.hasVoted[account] = weight;
        proposalVote.voters.add(account);
        proposalVote.voteType[account] = support;
        proposalVote.voteBlock[account] = block.number;
        return weight;
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint48) {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    ) internal override(GovernorUpgradeable, GovernorTimelockControlUpgradeable) returns (uint256) {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
    internal
    view
    override(GovernorUpgradeable, GovernorTimelockControlUpgradeable)
    returns (address)
    {
        return super._executor();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyGovernance {}
}
