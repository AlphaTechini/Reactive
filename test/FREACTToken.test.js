import { expect } from 'chai';
import hre from 'hardhat';
const { ethers } = hre;
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe("FREACTToken", function () {
  let freactToken;
  let owner;
  let user1;
  let user2;

  const CLAIM_AMOUNT = ethers.parseEther("1000"); // 1000 FREACT
  const MAX_PER_ADDRESS = ethers.parseEther("10000"); // 10,000 FREACT
  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 FREACT
  const COOLDOWN_PERIOD = 24 * 60 * 60; // 24 hours in seconds

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const FREACTToken = await ethers.getContractFactory("FREACTToken");
    freactToken = await FREACTToken.deploy();
    await freactToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await freactToken.name()).to.equal("Fake React");
      expect(await freactToken.symbol()).to.equal("FREACT");
    });

    it("Should have 18 decimals", async function () {
      expect(await freactToken.decimals()).to.equal(18);
    });

    it("Should mint initial supply to contract", async function () {
      const contractBalance = await freactToken.balanceOf(await freactToken.getAddress());
      expect(contractBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should set correct faucet constants", async function () {
      expect(await freactToken.CLAIM_AMOUNT()).to.equal(CLAIM_AMOUNT);
      expect(await freactToken.MAX_PER_ADDRESS()).to.equal(MAX_PER_ADDRESS);
      expect(await freactToken.COOLDOWN_PERIOD()).to.equal(COOLDOWN_PERIOD);
    });
  });

  describe("Faucet Claims", function () {
    it("Should allow first-time claim", async function () {
      expect(await freactToken.canClaim(user1.address)).to.be.true;
      
      await freactToken.connect(user1).claim();
      
      const balance = await freactToken.balanceOf(user1.address);
      expect(balance).to.equal(CLAIM_AMOUNT);
    });

    it("Should emit FaucetClaim event", async function () {
      const tx = await freactToken.connect(user1).claim();
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);
      
      await expect(tx)
        .to.emit(freactToken, "FaucetClaim")
        .withArgs(user1.address, CLAIM_AMOUNT, block.timestamp);
    });

    it("Should track total claimed per address", async function () {
      await freactToken.connect(user1).claim();
      
      const totalClaimed = await freactToken.totalClaimed(user1.address);
      expect(totalClaimed).to.equal(CLAIM_AMOUNT);
    });

    it("Should prevent claim before cooldown expires", async function () {
      await freactToken.connect(user1).claim();
      
      expect(await freactToken.canClaim(user1.address)).to.be.false;
      
      await expect(freactToken.connect(user1).claim())
        .to.be.revertedWith("FREACT: Cannot claim yet");
    });

    it("Should allow claim after cooldown period", async function () {
      await freactToken.connect(user1).claim();
      
      // Fast forward 24 hours
      await time.increase(COOLDOWN_PERIOD);
      
      expect(await freactToken.canClaim(user1.address)).to.be.true;
      await freactToken.connect(user1).claim();
      
      const balance = await freactToken.balanceOf(user1.address);
      expect(balance).to.equal(CLAIM_AMOUNT * 2n);
    });

    it("Should prevent claiming more than max per address", async function () {
      // Claim 10 times (10,000 FREACT total)
      for (let i = 0; i < 10; i++) {
        await freactToken.connect(user1).claim();
        await time.increase(COOLDOWN_PERIOD);
      }
      
      // 11th claim should fail
      await expect(freactToken.connect(user1).claim())
        .to.be.revertedWith("FREACT: Max claim limit reached");
    });

    it("Should track unique claimers", async function () {
      await freactToken.connect(user1).claim();
      await freactToken.connect(user2).claim();
      
      const stats = await freactToken.getFaucetStats();
      expect(stats.uniqueUsers).to.equal(2);
    });

    it("Should track total faucet claims", async function () {
      await freactToken.connect(user1).claim();
      await time.increase(COOLDOWN_PERIOD);
      await freactToken.connect(user1).claim();
      await freactToken.connect(user2).claim();
      
      const stats = await freactToken.getFaucetStats();
      expect(stats.totalClaims).to.equal(3);
    });
  });

  describe("View Functions", function () {
    it("Should return correct next claim time", async function () {
      await freactToken.connect(user1).claim();
      
      const nextClaimTime = await freactToken.getNextClaimTime(user1.address);
      const lastClaimTime = await freactToken.lastClaimTime(user1.address);
      
      expect(nextClaimTime).to.equal(lastClaimTime + BigInt(COOLDOWN_PERIOD));
    });

    it("Should return 0 for next claim time if can claim", async function () {
      const nextClaimTime = await freactToken.getNextClaimTime(user1.address);
      expect(nextClaimTime).to.equal(0);
    });

    it("Should return correct remaining allowance", async function () {
      await freactToken.connect(user1).claim();
      
      const remaining = await freactToken.getRemainingAllowance(user1.address);
      expect(remaining).to.equal(MAX_PER_ADDRESS - CLAIM_AMOUNT);
    });

    it("Should return correct claim history", async function () {
      await freactToken.connect(user1).claim();
      await time.increase(COOLDOWN_PERIOD);
      await freactToken.connect(user1).claim();
      
      const history = await freactToken.getClaimHistory(user1.address);
      expect(history.totalClaimedAmount).to.equal(CLAIM_AMOUNT * 2n);
      expect(history.claimCount).to.equal(2);
    });

    it("Should return correct faucet stats", async function () {
      await freactToken.connect(user1).claim();
      
      const stats = await freactToken.getFaucetStats();
      expect(stats.remainingSupply).to.equal(INITIAL_SUPPLY - CLAIM_AMOUNT);
      expect(stats.totalClaims).to.equal(1);
      expect(stats.uniqueUsers).to.equal(1);
    });
  });

  describe("Owner Functions", function () {
    it("Should allow owner to refill faucet", async function () {
      const refillAmount = ethers.parseEther("100000");
      
      await expect(freactToken.refillFaucet(refillAmount))
        .to.emit(freactToken, "FaucetRefilled")
        .withArgs(refillAmount);
      
      const contractBalance = await freactToken.balanceOf(await freactToken.getAddress());
      expect(contractBalance).to.equal(INITIAL_SUPPLY + refillAmount);
    });

    it("Should allow owner to emergency withdraw", async function () {
      const withdrawAmount = ethers.parseEther("1000");
      
      await freactToken.emergencyWithdraw(owner.address, withdrawAmount);
      
      const ownerBalance = await freactToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(withdrawAmount);
    });

    it("Should prevent non-owner from refilling", async function () {
      await expect(
        freactToken.connect(user1).refillFaucet(ethers.parseEther("1000"))
      ).to.be.reverted;
    });

    it("Should prevent non-owner from emergency withdraw", async function () {
      await expect(
        freactToken.connect(user1).emergencyWithdraw(user1.address, ethers.parseEther("1000"))
      ).to.be.reverted;
    });
  });
});
