/*
 * Copyright 2019 NEM
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    AmountDto,
    EmbeddedTransactionBuilder,
    EmbeddedVotingKeyLinkV1TransactionBuilder,
    FinalizationEpochDto,
    TimestampDto,
    TransactionBuilder,
    VotingKeyLinkV1TransactionBuilder,
    VotingKeyV1Dto,
} from 'catbuffer-typescript';
import { Convert } from '../../core/format';
import { Address, PublicAccount } from '../account';
import { NetworkType } from '../network';
import { UInt64 } from '../UInt64';
import { Deadline } from './Deadline';
import { InnerTransaction } from './InnerTransaction';
import { LinkAction } from './LinkAction';
import { Transaction } from './Transaction';
import { TransactionInfo } from './TransactionInfo';
import { TransactionType } from './TransactionType';
import { TransactionVersion } from './TransactionVersion';

export class VotingKeyLinkV1Transaction extends Transaction {
    /**
     * Create a voting key link transaction object
     * @param deadline - The deadline to include the transaction.
     * @param linkedPublicKey - The public key for voting (48 bytes).
     * @param startEpoch - The start finalization point.
     * @param endEpoch - The end finalization point.
     * @param linkAction - The account link action.
     * @param networkType = the network type.
     * @param maxFee - (Optional) Max fee defined by the sender
     * @param signature - (Optional) Transaction signature
     * @param signer - (Optional) Signer public account
     * @returns {VotingKeyLinkV1Transaction}
     */
    public static create(
        deadline: Deadline,
        linkedPublicKey: string,
        startEpoch: number,
        endEpoch: number,
        linkAction: LinkAction,
        networkType: NetworkType,
        maxFee: UInt64 = new UInt64([0, 0]),
        signature?: string,
        signer?: PublicAccount,
    ): VotingKeyLinkV1Transaction {
        return new VotingKeyLinkV1Transaction(
            networkType,
            TransactionVersion.VOTING_KEY_LINK_V1,
            deadline,
            maxFee,
            linkedPublicKey,
            startEpoch,
            endEpoch,
            linkAction,
            signature,
            signer,
        );
    }

    /**
     * @param networkType
     * @param version
     * @param deadline
     * @param maxFee
     * @param linkedPublicKey The public key of the remote account.
     * @param startEpoch The start finalization point.
     * @param endEpoch The start finalization point.
     * @param linkAction The account link action.
     * @param signature
     * @param signer
     * @param transactionInfo
     */
    constructor(
        networkType: NetworkType,
        version: number,
        deadline: Deadline,
        maxFee: UInt64,
        public readonly linkedPublicKey: string,
        public readonly startEpoch: number,
        public readonly endEpoch: number,
        public readonly linkAction: LinkAction,
        signature?: string,
        signer?: PublicAccount,
        transactionInfo?: TransactionInfo,
    ) {
        super(TransactionType.VOTING_KEY_LINK, networkType, version, deadline, maxFee, signature, signer, transactionInfo);
    }

    /**
     * Create a transaction object from payload
     * @param {string} payload Binary payload
     * @param {Boolean} isEmbedded Is embedded transaction (Default: false)
     * @returns {Transaction | InnerTransaction}
     */
    public static createFromPayload(payload: string, isEmbedded = false): Transaction | InnerTransaction {
        const builder = isEmbedded
            ? EmbeddedVotingKeyLinkV1TransactionBuilder.loadFromBinary(Convert.hexToUint8(payload))
            : VotingKeyLinkV1TransactionBuilder.loadFromBinary(Convert.hexToUint8(payload));
        const signerPublicKey = Convert.uint8ToHex(builder.getSignerPublicKey().key);
        const networkType = builder.getNetwork().valueOf();
        const signature = Transaction.getSignatureFromPayload(payload, isEmbedded);
        const transaction = VotingKeyLinkV1Transaction.create(
            isEmbedded
                ? Deadline.createEmtpy()
                : Deadline.createFromDTO((builder as VotingKeyLinkV1TransactionBuilder).getDeadline().timestamp),
            Convert.uint8ToHex(builder.getLinkedPublicKey().votingKeyV1),
            builder.getStartEpoch().finalizationEpoch,
            builder.getEndEpoch().finalizationEpoch,
            builder.getLinkAction().valueOf(),
            networkType,
            isEmbedded ? new UInt64([0, 0]) : new UInt64((builder as VotingKeyLinkV1TransactionBuilder).fee.amount),
            signature,
            signerPublicKey.match(`^[0]+$`) ? undefined : PublicAccount.createFromPublicKey(signerPublicKey, networkType),
        );
        return isEmbedded ? transaction.toAggregate(PublicAccount.createFromPublicKey(signerPublicKey, networkType)) : transaction;
    }

    /**
     * @internal
     * @returns {TransactionBuilder}
     */
    protected createBuilder(): TransactionBuilder {
        return new VotingKeyLinkV1TransactionBuilder(
            this.getSignatureAsBuilder(),
            this.getSignerAsBuilder(),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.VOTING_KEY_LINK.valueOf(),
            new AmountDto(this.maxFee.toDTO()),
            new TimestampDto(this.deadline.toDTO()),
            new VotingKeyV1Dto(Convert.hexToUint8(this.linkedPublicKey)),
            new FinalizationEpochDto(this.startEpoch),
            new FinalizationEpochDto(this.endEpoch),
            this.linkAction.valueOf(),
        );
    }

    /**
     * @internal
     * @returns {EmbeddedTransactionBuilder}
     */
    public toEmbeddedTransaction(): EmbeddedTransactionBuilder {
        return new EmbeddedVotingKeyLinkV1TransactionBuilder(
            this.getSignerAsBuilder(),
            this.versionToDTO(),
            this.networkType.valueOf(),
            TransactionType.VOTING_KEY_LINK.valueOf(),
            new VotingKeyV1Dto(Convert.hexToUint8(this.linkedPublicKey)),
            new FinalizationEpochDto(this.startEpoch),
            new FinalizationEpochDto(this.endEpoch),
            this.linkAction.valueOf(),
        );
    }

    /**
     * @internal
     * @returns {VotingKeyLinkV1Transaction}
     */
    resolveAliases(): VotingKeyLinkV1Transaction {
        return this;
    }

    /**
     * @internal
     * Check a given address should be notified in websocket channels
     * @param address address to be notified
     * @returns {boolean}
     */
    public shouldNotifyAccount(address: Address): boolean {
        return super.isSigned(address) || Address.createFromPublicKey(this.linkedPublicKey, this.networkType).equals(address);
    }
}
