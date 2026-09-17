// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { P256 } from "@openzeppelin/contracts/utils/cryptography/P256.sol";

/**
 * TrustMAttest: proves on chain that a P-256 public key lives inside a genuine Infineon OPTIGA Trust M.
 *
 *  Every Trust M ships with a factory key (slot E0F0) and an X.509 certificate for it (slot E0E0) signed by
 *  Infineon's "OPTIGA(TM) Trust M CA". The CA's public key is pinned here at deploy time. attest() takes the
 *  chip's certificate bytes, checks the CA signed its TBS part, pulls the chip's public key out of the signed
 *  bytes and records it. After that, isChipSignature() answers "was this hash signed by a real Trust M".
 *
 *  Why offsets from the caller and not a DER parser: the caller cannot cheat. The CA signature covers exactly
 *  the TBS range given, so a wrong range fails the signature. The key must sit inside that range right after
 *  the fixed 27-byte SubjectPublicKeyInfo header for an uncompressed P-256 key, so it cannot point at some
 *  other 64 signed bytes.
 *
 *  Signatures with s above N/2 are folded to N-s: OpenZeppelin's P256 rejects high-s and Infineon's CA does
 *  not normalise.
 */
contract TrustMAttest {
    uint256 private constant N = 0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551;
    uint256 private constant HALF_N = 0x7fffffff800000007fffffffffffffffde737d56d38bcf4279dce5617e3192a8;
    // SEQUENCE { SEQUENCE { OID ecPublicKey, OID prime256v1 }, BIT STRING 0x04 || X || Y }
    bytes private constant P256_SPKI = hex"3059301306072a8648ce3d020106082a8648ce3d03010703420004";

    bytes32 public immutable caX;
    bytes32 public immutable caY;

    mapping(bytes32 keyId => bool) public attested;

    event Attested(bytes32 indexed keyId, bytes32 x, bytes32 y);

    error BadKeyOffset();
    error NotP256Key();
    error CertNotSignedByCA();

    constructor(bytes32 _caX, bytes32 _caY) {
        caX = _caX;
        caY = _caY;
    }

    function keyIdOf(bytes32 x, bytes32 y) public pure returns (bytes32) {
        return keccak256(abi.encode(x, y));
    }

    /// @param cert     the chip's DER certificate (slot E0E0, without the C0 TLS wrapper)
    /// @param tbsStart offset of the TBSCertificate SEQUENCE inside cert
    /// @param tbsLen   its length, header included
    /// @param pkOffset offset of the SubjectPublicKeyInfo inside cert
    /// @param r        the CA's ECDSA signature over sha256(TBS)
    function attest(bytes calldata cert, uint256 tbsStart, uint256 tbsLen, uint256 pkOffset, bytes32 r, bytes32 s)
        external
        returns (bytes32 x, bytes32 y)
    {
        if (pkOffset < tbsStart || pkOffset + 91 > tbsStart + tbsLen || tbsStart + tbsLen > cert.length) {
            revert BadKeyOffset();
        }
        if (keccak256(cert[pkOffset:pkOffset + 27]) != keccak256(P256_SPKI)) revert NotP256Key();
        x = bytes32(cert[pkOffset + 27:pkOffset + 59]);
        y = bytes32(cert[pkOffset + 59:pkOffset + 91]);
        bytes32 h = sha256(cert[tbsStart:tbsStart + tbsLen]);
        if (!P256.verify(h, r, lowS(s), caX, caY)) revert CertNotSignedByCA();
        bytes32 id = keyIdOf(x, y);
        attested[id] = true;
        emit Attested(id, x, y);
    }

    /// True when (x, y) was attested and signed hash.
    function isChipSignature(bytes32 x, bytes32 y, bytes32 hash, bytes32 r, bytes32 s) external view returns (bool) {
        return attested[keyIdOf(x, y)] && P256.verify(hash, r, lowS(s), x, y);
    }

    function lowS(bytes32 s) public pure returns (bytes32) {
        return uint256(s) > HALF_N ? bytes32(N - uint256(s)) : s;
    }
}
