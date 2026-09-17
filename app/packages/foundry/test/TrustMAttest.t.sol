// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import { TrustMAttest } from "../contracts/TrustMAttest.sol";

/// Real data read off an Adafruit 4351 Trust M on 2026-09-17: its E0E0 factory certificate (serial 0x2d8a1fee,
/// issuer "Infineon OPTIGA(TM) Trust M CA 101"), that CA's public key, and an E0F0 signature the chip made over MSG.
contract TrustMAttestTest is Test {
    bytes constant CERT = hex"308201d83082017ea00302010202042d8a1fee300a06082a8648ce3d0403023072310b30090603550406130244453121301f060355040a0c18496e66696e656f6e20546563686e6f6c6f6769657320414731133011060355040b0c0a4f505449474128544d29312b302906035504030c22496e66696e656f6e204f505449474128544d29205472757374204d20434120313031301e170d3139303730313135303431345a170d3339303730313135303431345a301c311a301806035504030c11496e66696e656f6e20496f54204e6f64653059301306072a8648ce3d020106082a8648ce3d030107034200043ff7fda4432977ba0aa1edcc6d7a73ba55f2d0a9ee7fb68d5d928ad163b45988e17538d429a176924d00004c248ec6e24beae743193f929b48f5adab107298e2a3583056300e0603551d0f0101ff040403020080300c0603551d130101ff0402300030150603551d20040e300c300a06082a82140044011401301f0603551d230418301680143c308c5cd58ae8a35d3280e45483b2ffcd864d23300a06082a8648ce3d04030203480030450220325ba600cdc7896a8bdafe0124b988a14b499c652631d8f5453ff5465767801902210083fc1e11bccc95b2bd058e8d42161f5e892e2a003f6e79c56925ad8df1994462";
    uint256 constant TBS_START = 4;
    uint256 constant TBS_LEN = 386;
    uint256 constant PK_OFFSET = 209;
    bytes32 constant CERT_R = 0x325ba600cdc7896a8bdafe0124b988a14b499c652631d8f5453ff54657678019;
    bytes32 constant CERT_S = 0x83fc1e11bccc95b2bd058e8d42161f5e892e2a003f6e79c56925ad8df1994462;
    bytes32 constant CHIP_X = 0x3ff7fda4432977ba0aa1edcc6d7a73ba55f2d0a9ee7fb68d5d928ad163b45988;
    bytes32 constant CHIP_Y = 0xe17538d429a176924d00004c248ec6e24beae743193f929b48f5adab107298e2;
    bytes32 constant CA_X = 0x97337734ad7423a14bf40fd4ee1d27af8ed05ae87970c74dfe29889b499ad2d0;
    bytes32 constant CA_Y = 0x1ea249ae7910f052c59d85514a8215e2d63e4730cdfb5cc153bbcc00a7e6408b;
    bytes32 constant MSG = 0x89ff87b7c56c0d4e0f2ad4d15c1e2ab9a5d0b02f1d5b4c2b2f6ee0f5bb6d1a11;
    bytes32 constant SIG_R = 0x49e2c1a3abe685e38950684d398cfd55524ee4098862c2828ce4dfac78f081b5;
    bytes32 constant SIG_S = 0x6b8df25e396a294a202c59d6acb488901add8dd3321054dd653fbe2dc48600a2;

    TrustMAttest a;

    function setUp() public {
        a = new TrustMAttest(CA_X, CA_Y);
    }

    function testAttestRealChip() public {
        (bytes32 x, bytes32 y) = a.attest(CERT, TBS_START, TBS_LEN, PK_OFFSET, CERT_R, CERT_S);
        assertEq(x, CHIP_X);
        assertEq(y, CHIP_Y);
        assertTrue(a.attested(a.keyIdOf(CHIP_X, CHIP_Y)));
        assertTrue(a.isChipSignature(CHIP_X, CHIP_Y, MSG, SIG_R, SIG_S));
    }

    function testChipSignatureOfOtherHashFails() public {
        a.attest(CERT, TBS_START, TBS_LEN, PK_OFFSET, CERT_R, CERT_S);
        assertFalse(a.isChipSignature(CHIP_X, CHIP_Y, keccak256("other"), SIG_R, SIG_S));
    }

    function testUnattestedKeyFails() public view {
        assertFalse(a.isChipSignature(CHIP_X, CHIP_Y, MSG, SIG_R, SIG_S));
    }

    function testTamperedCertFails() public {
        bytes memory cert = CERT;
        cert[PK_OFFSET + 40] ^= 0x01;   // flip one bit of the public key inside the signed part
        vm.expectRevert(TrustMAttest.CertNotSignedByCA.selector);
        a.attest(cert, TBS_START, TBS_LEN, PK_OFFSET, CERT_R, CERT_S);
    }

    function testWrongCAFails() public {
        TrustMAttest b = new TrustMAttest(CHIP_X, CHIP_Y);
        vm.expectRevert(TrustMAttest.CertNotSignedByCA.selector);
        b.attest(CERT, TBS_START, TBS_LEN, PK_OFFSET, CERT_R, CERT_S);
    }

    function testKeyOffsetMustBeTheSPKI() public {
        vm.expectRevert(TrustMAttest.NotP256Key.selector);
        a.attest(CERT, TBS_START, TBS_LEN, PK_OFFSET + 1, CERT_R, CERT_S);
    }
}
