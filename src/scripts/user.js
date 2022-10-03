console.log('%cD2 SYNERGY', 'font-weight: bold;font-size: 40px;color: white;');
console.log('// Welcome to D2Synergy, Please report any errors to @beru2003 on Twitter.');

// Import modules
import axios from 'axios';
import { ValidateManifest, ReturnEntry } from './utils/ValidateManifest.js';
import {
    VerifyState,
    ParseChar,
    StartLoad,
    StopLoad,
    MakeBountyElement,
    RedirUser,
    InsertSeperators,
    ParseBounties,
    PushToDOM,
    SortByGroup,
    SortByType,
    SortBountiesByType,
    CalcXpYield,
    ReturnSeasonPassProgressionStats,
    ReturnSeasonPassLevel,
    LoadPrimaryCharacter,
    CacheAuditItem,
    AddNumberToElementInner,
    CreateFilters, 
    CacheReturnItem } from './utils/ModuleScript.js';
import {
    itemTypeKeys,
    vendorKeys,
    baseYields,
    petraYields } from './utils/SynergyDefinitions.js';
import { bountyPropCount, PushProps } from './utils/MatchProps.js';
import { AddEventListeners } from './utils/Events.js';


// Validate state parameter
VerifyState();

// Start load sequence
StartLoad();

// Utils
let urlParams = new URLSearchParams(window.location.search),
    sessionStorage = window.sessionStorage,
    localStorage = window.localStorage,
    log = console.log.bind(console),
    startTime = new Date(),
    sessionCache = {},
    userStruct = {};

// Defintion objects
let progressionDefinitions = {},
    seasonPassDefinitions = {},
    objectiveDefinitions = {},
    destinyUserProfile = {},
    seasonDefinitions = {},
    itemDefinitions = {};

// User info variables
let destinyMembershipId,
    membershipType,
    characters;

// Authorization information
export const homeUrl = import.meta.env.HOME_URL,
    axiosHeaders = {
        ApiKey: import.meta.env.API_KEY,
        Authorization: import.meta.env.AUTH
    },
    clientId = import.meta.env.CLIENT_ID;

// Put version number in navbar
document.getElementById('navBarVersion').innerHTML = `${import.meta.env.version}`;

// Set default axios header
axios.defaults.headers.common = {
    "X-API-Key": `${axiosHeaders.ApiKey}`
};

// Declare global exports
export let charBounties = [];
export let filterDivs = {};
userStruct.bools = {};
userStruct.ints = {};
userStruct.objs = {};

// Push data
userStruct.objs.currView = document.getElementById('pursuitsContainer');
userStruct.bools.characterLoadToggled = false;
userStruct.bools.filterToggled = false;

// Assign element fields for user settings
export let itemDisplaySize;
let rangeSlider = document.getElementById('itemSizeSlider'),
    rangeValueField = document.getElementById('itemSizeField'),
    bountyImage = document.getElementById('settingsBountyImage');

// Push cache results to vars
await CacheReturnItem('itemDisplaySize')
    .then((result) => {
        itemDisplaySize = result;
    })
    .catch((error) => {
        CacheAuditItem('itemDisplaySize', 55);
        itemDisplaySize = 55;
    });

// Slider section values
rangeSlider.value = itemDisplaySize;
rangeValueField.innerHTML = `${itemDisplaySize}px`;
bountyImage.style.width = `${itemDisplaySize}px`;

// Set checkboxes to chosen state, from localStorage (userCache)
document.getElementById('checkboxRefreshOnInterval').checked = await CacheReturnItem('isRefreshOnIntervalToggled');
document.getElementById('checkboxRefreshWhenFocused').checked = await CacheReturnItem('isRefreshOnFocusToggled');


// Authorize with Bungie.net
// @string {authCode}
export async function BungieOAuth (authCode) {

    let AccessToken = {},
        RefreshToken = {},
        components = {},
        AuthConfig = {
            headers: {
                Authorization: `Basic ${axiosHeaders.Authorization}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };

    // Authorize user and get credentials (first time sign-on (usually))
    await axios.post('https://www.bungie.net/platform/app/oauth/token/', `grant_type=authorization_code&code=${authCode}`, AuthConfig)
        .then(res => {
            let data = res.data;

            log(res);

            components['membership_id'] = data['membership_id'];
            components['token_type'] = data['token_type'];
            components['authorization_code'] = authCode;

            AccessToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
            AccessToken['expires_in'] = data['expires_in'];
            AccessToken['value'] = data['access_token'];

            RefreshToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
            RefreshToken['expires_in'] = data['refresh_expires_in'];
            RefreshToken['value'] = data['refresh_token'];

            localStorage.setItem('accessToken', JSON.stringify(AccessToken));
            localStorage.setItem('components', JSON.stringify(components));
            localStorage.setItem('refreshToken', JSON.stringify(RefreshToken));

            log('-> Authorized with Bungie.net!');
        })
        .catch(err => {
            if (err.response.data['error_description'] == 'AuthorizationCodeInvalid' || err.response.data['error_description'] == 'AuthorizationCodeStale') {
                window.location.href = `https://www.bungie.net/en/oauth/authorize?&client_id=${clientId}&response_type=code`;
            }
            else {
                console.error(err);
            };
        });
};


// Check tokens for expiration
export async function CheckComponents () {
    
    let acToken = JSON.parse(localStorage.getItem('accessToken')),
        rsToken = JSON.parse(localStorage.getItem('refreshToken')),
        comps = JSON.parse(localStorage.getItem('components')),
        RefreshToken = {},
        AccessToken = {},
        components = {},
        AuthConfig = {
            headers: {
                Authorization: `Basic ${axiosHeaders.Authorization}`,
                "Content-Type": "application/x-www-form-urlencoded"
            }
        };


    // Remove invalid localStorage items & Redirect if items are missing
    var keyNames = ['value', 'inception',  'expires_in', 'membership_id', 'token_type', 'authorization_code'],
        cKeys = ['membership_id', 'token_type', 'authorization_code'],
        tokenKeys = ['inception', 'expires_in', 'value'];


    Object.keys(rsToken).forEach(item => {
        if (!keyNames.includes(item)) delete rsToken[item], localStorage.setItem('refreshToken', JSON.stringify(rsToken))
    });
    Object.keys(acToken).forEach(item => {
        if (!keyNames.includes(item)) delete acToken[item], localStorage.setItem('accessToken', JSON.stringify(acToken));
    });
    Object.keys(comps).forEach(item => {
        if (!keyNames.includes(item)) delete comps[item], localStorage.setItem('components', JSON.stringify(comps));
    });

    Object.keys(tokenKeys).forEach(item => {
        if (!Object.keys(rsToken).includes(tokenKeys[item])) RedirUser(homeUrl, 'rsToken=true');
        if (!Object.keys(acToken).includes(tokenKeys[item])) RedirUser(homeUrl, 'acToken=true');
    });
    Object.keys(cKeys).forEach(item => {
        if (!Object.keys(comps).includes(cKeys[item])) RedirUser(homeUrl, 'comps=true');
    });



    // Check if either tokens have expired
    let isAcTokenExpired = (acToken.inception + acToken['expires_in']) <= Math.round(new Date().getTime() / 1000) - 1,
        isRsTokenExpired = (rsToken.inception + rsToken['expires_in']) <= Math.round(new Date().getTime() / 1000) - 1;
    if (isAcTokenExpired || isRsTokenExpired) {

        // Temporary deletion => Default headers are added back after OAuthFlow mechanisms
        delete axios.defaults.headers.common['X-API-Key'];

        // Change load content
        document.getElementById('loadingText').innerHTML = 'Refreshing Tokens';

        // If either tokens have expired
        isAcTokenExpired ? log('-> Access token expired..') : log('-> Refresh token expired..');
        await axios.post('https://www.bungie.net/Platform/App/OAuth/token/', `grant_type=refresh_token&refresh_token=${rsToken.value}`, AuthConfig)
            .then(res => {
                let data = res.data;

                components["membership_id"] = data["membership_id"];
                components["token_type"] = data["token_type"];
                components["authorization_code"] = comps["authorization_code"];

                AccessToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
                AccessToken['expires_in'] = data['expires_in'];
                AccessToken['value'] = data['access_token'];

                RefreshToken['inception'] = Math.round(new Date().getTime() / 1000); // Seconds
                RefreshToken['expires_in'] = data['refresh_expires_in'];
                RefreshToken['value'] = data['refresh_token'];

                localStorage.setItem('accessToken', JSON.stringify(AccessToken));
                localStorage.setItem('components', JSON.stringify(components));
                localStorage.setItem('refreshToken', JSON.stringify(RefreshToken));
            });
        isAcTokenExpired ? log('-> Access Token Refreshed!') : log('-> Refresh Token Refreshed!');
    };
    log('-> Tokens Validated!')
};


// Main OAuth flow mechanism
export async function OAuthFlow() {
    log('OAuthFlow START')
    let rsToken = JSON.parse(localStorage.getItem('refreshToken')),
        acToken = JSON.parse(localStorage.getItem('accessToken')),
        comps = JSON.parse(localStorage.getItem('components')),
        authCode = urlParams.get('code'); // ONLY place where authCode is to be fetched from

        // Clean URL
        window.history.pushState({}, document.title, window.location.pathname);

    // Wrap in try.except for error catching
    try {
        // If user has no localStorage items and the code is incorrect
        if (authCode && (!comps || !acToken || !rsToken)) {
            await BungieOAuth(authCode);
        }
        // User has no credentials, fired before other conditions
        else if (!authCode && (!comps || !acToken || !rsToken)) {
            window.location.href = homeUrl;
        }

        // If user has authorized beforehand, but came back through empty param URL
        // If user has code and localStorage components
        else if (!authCode || authCode && (comps || acToken || rsToken)) {
            await CheckComponents();
        }

        // When user comes back with localStorage components but without param URL
        else if (!authCode && (comps || acToken || rsToken)) {
            await CheckComponents();
        }

        // Otherwise, redirect the user back to the 'Authorize' page
        else {
            window.location.href = homeUrl;
        };
    } catch (error) {
        console.error(error); // display error page, with error and options for user
    };
    log('OAuthFlow END');
    log(`-> OAuth Flow Complete! [Elapsed: ${(new Date() - startTime)}ms]`);
};


// Fetch basic bungie user details
export async function FetchBungieUserDetails() {
    log('FetchBungieUserDetails START')
    let components = JSON.parse(localStorage.getItem('components')),
        axiosConfig = {
            headers: {
                Authorization: `Bearer ${JSON.parse(localStorage.getItem('accessToken')).value}`,
                "X-API-Key": `${axiosHeaders.ApiKey}`
            }
        };
        

    // Change load content
    document.getElementById('loadingText').innerHTML = 'Fetching User Details';

    // Variables to check/store
    membershipType = sessionStorage.getItem('membershipType'),
    destinyMembershipId = JSON.parse(sessionStorage.getItem('destinyMembershipId')),
    destinyUserProfile = JSON.parse(sessionStorage.getItem('destinyUserProfile'));

    // If user has no cache
    if (!membershipType || !destinyMembershipId || !destinyUserProfile) {

        // Get all linked profiles from users account(s) and get the primary one - even if primaryMembersipId does not exist
        let LinkedProfiles = await axios.get(`https://www.bungie.net/Platform/Destiny2/1/Profile/${components['membership_id']}/LinkedProfiles/?getAllMemberships=true`, axiosConfig);

        destinyMembershipId = LinkedProfiles.data.Response.profiles[0].membershipId;
        membershipType = LinkedProfiles.data.Response.profiles[0].membershipType;

        // Fetch user profile
        let userProfile = await axios.get(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${destinyMembershipId}/?components=200`, axiosConfig);
        
        destinyUserProfile = userProfile.data.Response;

        // Cache the response
        sessionStorage.setItem('membershipType', membershipType);
        sessionStorage.setItem('destinyMembershipId', JSON.stringify(destinyMembershipId));
        sessionStorage.setItem('destinyUserProfile', JSON.stringify(destinyUserProfile));
    };

    // Load from cache
    if (membershipType && destinyMembershipId && destinyUserProfile) {

        // Loop over characters
        characters = destinyUserProfile.characters.data;
        for (let item in characters) {
            let char = characters[item];
            document.getElementById(`classBg${char.classType}`).src = `https://www.bungie.net${char.emblemBackgroundPath}`;
            document.getElementById(`classType${char.classType}`).innerHTML = `${ParseChar(char.classType)}`;
            document.getElementById(`classLight${char.classType}`).innerHTML = `${char.light}`;
        };

        // Push relevant items to the browser
        userStruct['characters'] = characters;

        // Change DOM content
        document.getElementById('charactersContainer').style.display = 'inline-block';
        document.getElementById('categories').style.display = 'block';
        document.getElementById('statsContainer').style.display = 'block';
    };
    log('FetchBungieUserDetails END')
};


// Load character from specific index
// @int {classType}, @boolean {isRefresh}
export async function LoadCharacter(classType, isRefresh) {

    log('LoadPrimaryCharacter START');

    if (!userStruct.characterLoadToggled) {

        // Configure load sequence
        document.getElementById('loadingText').innerHTML = 'Indexing Character';
        await CheckComponents();

        // Globals in this scope
        let membershipType = sessionStorage.getItem('membershipType'), 
            CharacterProgressions,
            CharacterInventories,
            CharacterObjectives,
            ProfileProgressions,
            seasonPassInfo = {},
            seasonPassLevel = 0,
            CharacterEquipment,
            prestigeProgressionSeasonInfo,
            CurrentSeasonHash,
            seasonProgressionInfo = {},
            characterId,
            ItemSockets;


        // Toggle character load
        userStruct.characterLoadToggled = true;
        CacheAuditItem('lastChar', classType);

        // Clear (emtpy fields that are going to change) DOM content
        document.getElementById('loadingContentContainer').style.display = 'block';
        document.getElementById('contentDisplay').style.display = 'none';
        document.getElementById('noItemsTooltip').style.display = 'none';
        document.getElementById('bountyItems').innerHTML = '';
        document.getElementById('overlays').innerHTML = '';
        document.getElementById('filters').innerHTML = '';

        // Filter out other classes that are not classType
        for (let char in characters) {
            if (characters[char].classType !== classType) {
                document.getElementById(`charContainer${characters[char].classType}`).classList.add('elBlur');
            }
            else if (characters[char].classType === classType) {
                document.getElementById(`charContainer${characters[char].classType}`).classList.remove('elBlur');
            };

            document.getElementById(`charContainer${characters[char].classType}`).style.display = 'block';
        };

        // Get chosen character and save index
        for (let entry in destinyUserProfile.characters.data) {

            let character = destinyUserProfile.characters.data[entry];
            if (character.classType === classType) {
                characterId = character.characterId;
            };
        };

        // OAuth header guarantees a response
        if (!sessionCache.resCharacterInventories || isRefresh) {

            // Set request information
            let axiosConfig = {
                headers: {
                    Authorization: `Bearer ${JSON.parse(localStorage.getItem('accessToken')).value}`,
                    "X-API-Key": `${axiosHeaders.ApiKey}`
                }
            };

            let resCharacterInventories = await axios.get(`https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${destinyMembershipId}/?components=100,104,201,202,205,300,301,305`, axiosConfig);
            let charInvRoot = resCharacterInventories.data.Response;

            CharacterInventories = charInvRoot.characterInventories.data;
            CurrentSeasonHash = charInvRoot.profile.data.currentSeasonHash;
            CharacterProgressions = charInvRoot.characterProgressions.data[characterId].progressions;
            CharacterObjectives = charInvRoot.itemComponents.objectives.data;
            CharacterEquipment = charInvRoot.characterEquipment.data[characterId].items;
            ProfileProgressions = charInvRoot.profileProgression.data;
            ItemSockets = charInvRoot.itemComponents.sockets.data;
            sessionCache.resCharacterInventories = resCharacterInventories;
        }
        else if (sessionCache.resCharacterInventories) {

            let charInvRoot = sessionCache.resCharacterInventories.data.Response;

            CharacterInventories = charInvRoot.characterInventories.data;
            CurrentSeasonHash = charInvRoot.profile.data.currentSeasonHash;
            CharacterProgressions = charInvRoot.characterProgressions.data[characterId].progressions;
            CharacterObjectives = charInvRoot.itemComponents.objectives.data;
            CharacterEquipment = charInvRoot.characterEquipment.data[characterId].items;
            ProfileProgressions = charInvRoot.profileProgression.data;
            ItemSockets = charInvRoot.itemComponents.sockets.data;
        };

        // Iterate over CharacterInventories[characterId].items
        let charInventory = CharacterInventories[characterId].items, amountOfBounties = 0;

        // Make array with specified groups
        let bountyArr = {};
        vendorKeys.forEach(key => {
            bountyArr[key] = [];
        });

        // Loop over inventory items and emit bounties
        let parsedBountiesResponse = ParseBounties(charInventory, CharacterObjectives, itemDefinitions, objectiveDefinitions);
        charBounties = parsedBountiesResponse.charBounties;
        amountOfBounties = parsedBountiesResponse.amountOfBounties;

        // Assign objective(s) itemDefinitions to each item
        Object.keys(charBounties).forEach(v => {
            
            let objHashes = charBounties[v].objectives.objectiveHashes;
            charBounties[v].objectiveDefinitions = [];

            for (let objHash of objHashes) {
                charBounties[v].objectiveDefinitions.push(objectiveDefinitions[objHash]);
            };
        });

        // Sort bounties by group (vanguard, gunsmith etc)
        bountyArr = SortByGroup(charBounties, bountyArr, vendorKeys);

        // Sort bounties by type (weekly, daily etc)
        bountyArr = SortByType(bountyArr, SortBountiesByType);

        // Push sorted bounties to the page
        PushToDOM(bountyArr, amountOfBounties, MakeBountyElement);

        // Calculate XP yield from (active) bounties
        let totalXpYield = CalcXpYield(bountyArr, itemTypeKeys, baseYields, petraYields);

        // Ghost mod bonus Xp modifier variable
        let ghostModBonusXp = 0;

        // Fetch equipped ghost mods
        CharacterEquipment.forEach(v => {
            if (v.bucketHash === 4023194814) { // Ghost bucket hash

                let itemPlugSet = ItemSockets[v.itemInstanceId].sockets;

                Object.keys(itemPlugSet).forEach(v => {

                    let plugHash = itemPlugSet[v].plugHash;
                    if (plugHash === 1820053069) { // Flickering Ligt - 2%
                        ghostModBonusXp = 2;
                    }
                    else if (plugHash === 1820053068) { // Little Light - 3%
                        ghostModBonusXp = 3;
                    }
                    else if (plugHash === 1820053071) { // Hopeful Light - 5%
                        ghostModBonusXp = 5;
                    }
                    else if (plugHash === 1820053070) { // Burning Light - 8%
                        ghostModBonusXp = 8;
                    }
                    else if (plugHash === 1820053065) { // Guiding Light - 10%
                        ghostModBonusXp = 10;
                    }
                    else if (plugHash === 1820053064) { // Blinding Light - 12%
                        ghostModBonusXp = 12;
                    };
                });
            };
        });

        // Get season pass info
        seasonProgressionInfo = CharacterProgressions[seasonDefinitions[CurrentSeasonHash].seasonPassProgressionHash];
        seasonPassInfo = seasonPassDefinitions[seasonDefinitions[CurrentSeasonHash].seasonPassHash];
        prestigeProgressionSeasonInfo = CharacterProgressions[seasonPassInfo.prestigeProgressionHash];
        seasonPassLevel = await ReturnSeasonPassLevel(seasonProgressionInfo, prestigeProgressionSeasonInfo);

        let seasonPassRewardsTrack = progressionDefinitions[seasonPassInfo.rewardProgressionHash].rewardItems, rewardsTrack = {};

        // Iterate through rewards track and formalize into a clean(er) array structure
        seasonPassRewardsTrack.forEach(v => {

            if (!rewardsTrack[v.rewardedAtProgressionLevel]) {
                rewardsTrack[v.rewardedAtProgressionLevel] = [];
            };

            rewardsTrack[v.rewardedAtProgressionLevel].push(v.itemHash);
        });

        // Call function to get progressions for season pass XP and bonus stats
        const seasonPassProgressionStats = await ReturnSeasonPassProgressionStats(seasonProgressionInfo, prestigeProgressionSeasonInfo, rewardsTrack, itemDefinitions);

        // Season Pass innerHTML changes
        AddNumberToElementInner('seasonPassXpToNextRank', InsertSeperators(seasonPassProgressionStats.progressToNextLevel));
        AddNumberToElementInner('seasonPassXpToMaxRank', InsertSeperators(seasonPassProgressionStats.xpToMaxSeasonPassRank));
        AddNumberToElementInner('seasonPassFireteamBonus', `${seasonPassProgressionStats.sharedWisdomBonusValue}%`);
        AddNumberToElementInner('seasonPassRankLevel', seasonPassProgressionStats.seasonPassLevel);
        AddNumberToElementInner('seasonPassXpBonus', `${seasonPassProgressionStats.bonusXpValue}%`); // +12 for bonus large xp modifier

        // Pass in stats for the net breakdown section
        AddNumberToElementInner('sharedWisdomValue', `${seasonPassProgressionStats.sharedWisdomBonusValue}%`);
        AddNumberToElementInner('ghostModValue', `${ghostModBonusXp}%`);
        AddNumberToElementInner('bonusXpValue', `${seasonPassProgressionStats.bonusXpValue}%`);

        // Bright Engram innerHTML changes
        // AddNumberToElementInner('totalBrightEngramsEarned', InsertSeperators(seasonProgressionStats[1]));
        // AddNumberToElementInner('XpToNextEngram', InsertSeperators(seasonProgressionStats[0]));


        // Add all the modifiers together, append 1 and times that value by the base total XP
        const totalXpBonusPercent = ((seasonPassProgressionStats.bonusXpValue + seasonPassProgressionStats.sharedWisdomBonusValue + ghostModBonusXp) / 100) + 1; // Format to 1.x
        AddNumberToElementInner('totalNetXpField', `${InsertSeperators(totalXpYield * totalXpBonusPercent)}`);


        // Get statistics for subheadings
        let amountOfExpiredBounties = 0, amountOfCompletedBounties = 0;

        for (let bounty of charBounties) {
            if (bounty.isComplete) {
                amountOfCompletedBounties++;
            };
            if (bounty.isExpired) {
                amountOfExpiredBounties++;
            };
        };

        // Push subheading statistics
        AddNumberToElementInner('expiredBountiesAmountField', amountOfExpiredBounties);
        AddNumberToElementInner('completedBountiesAmountField', amountOfCompletedBounties);
        AddNumberToElementInner('currentSeasonNameField', seasonPassInfo.displayProperties.name);

        // Check if ghost mods are slotted, turn off checkmark if not
        if (!ghostModBonusXp) {
            document.getElementById('ghostModCheckmark').style.display = 'none';
            document.getElementById('ghostModCross').style.display = 'inline-block';
        }
        else {
            document.getElementById('ghostModCheckmark').style.display = 'inline-block';
            document.getElementById('ghostModCross').style.display = 'none';
        };

        // Check if shared wisdom is not equal to 0, turn off checkmark if not
        if (!seasonPassProgressionStats.sharedWisdomBonusValue) {
            document.getElementById('sharedWisdomCheckmark').style.display = 'none';
            document.getElementById('sharedWisdomCross').style.display = 'inline-block';
        }
        else {
            document.getElementById('sharedWisdomCheckmark').style.display = 'inline-block';
            document.getElementById('sharedWisdomCross').style.display = 'none';
        };

        // Check if bonus xp is not equal to 0, turn off checkmark if not
        if (!seasonPassProgressionStats.bonusXpValue) {
            document.getElementById('bonusXpCheckmark').style.display = 'none';
            document.getElementById('bonusXpCross').style.display = 'inline-block';
        }
        else {
            document.getElementById('bonusXpCheckmark').style.display = 'inline-block';
            document.getElementById('bonusXpCross').style.display = 'none';
        };

        // Get artifact info -- check if profile has artifact
        let artifact;
        if (ProfileProgressions.seasonalArtifact) {

            // Change corresponding HTML elements to display stats
            artifact = ProfileProgressions.seasonalArtifact;
            AddNumberToElementInner('artifactStatsArtifactBonus', `+${artifact.powerBonus}`);
            AddNumberToElementInner('artifactXpToNextUnlock', InsertSeperators(artifact.pointProgression.nextLevelAt - artifact.pointProgression.progressToNextLevel));
            AddNumberToElementInner('artifactXpToNextPowerBonus', InsertSeperators(artifact.powerBonusProgression.nextLevelAt - artifact.powerBonusProgression.progressToNextLevel));
        }
        else if (!ProfileProgressions.seasonalArtifact) {

            // Change corresponding HTML elements to display stats
            document.getElementById('artifactStatsFirstContainer').style.display = 'none';
            document.getElementById('artifactStatsSecondContainer').style.display = 'none';
            document.getElementById('artifactStatsThirdMetricContainer').style.display = 'none';
            document.getElementById('artifactStatsNoArtifactIsPresent').style.display = 'block';
        };

        // Check if there are no bounties
        if (amountOfBounties === 0) {

            // Toggle no items tooltip
            document.getElementById('noItemsTooltip').innerHTML = `You don't have bounties on this character. How dare you. (-(-_(-_-)_-)-)`;
            document.getElementById('noItemsTooltip').style.display = 'inline-block';

            // Make potential yeild stats 0 by default
            AddNumberToElementInner('totalXpField', 0);
            AddNumberToElementInner('totalSpLevelsField', 0);

            // Change subheading field to show amount of bounties
            AddNumberToElementInner('bountiesAmountField', 0);
        }
        else if (amountOfBounties > 0) {

            // Change subheading field to show amount of bounties
            AddNumberToElementInner('bountiesAmountField', `${amountOfBounties}`);

            // Change potential yield stats since there are bounties present
            AddNumberToElementInner('totalXpField', InsertSeperators(totalXpYield));
            AddNumberToElementInner('totalSpLevelsField', totalXpYield / 100000);
        };

        // Load synergyDefinitions and match against bounties
        await PushProps();
        await CreateFilters('charBounties', bountyPropCount);
        userStruct.characterLoadToggled = false;

        // Stop loading sequence
        StopLoad();

        // Toggle elements
        userStruct.objs.currView.style.display = 'block';
        document.getElementById('contentDisplay').style.display = 'inline-block';
    };
    log('LoadPrimaryCharacter END');
};


// Anonymous function for main
// @boolean {isPassiveReload}
export async function main(isPassiveReload) {

    // Check for passive reload
    if (isPassiveReload) {
        startTime = new Date();
        StartLoad();
        log(`-> Passive Reload Started..`);
    };

    // OAuth Flow
    await OAuthFlow();

    // Add default headers back, in case OAuthFlow needed a refresh
    axios.defaults.headers.common = { "X-API-Key": `${axiosHeaders.ApiKey}` };

    // Fetch bungie user details
    await FetchBungieUserDetails();

    // Validate and fetch manifest
    await ValidateManifest();

    // Assign defintions to their global counterparts
    progressionDefinitions = await ReturnEntry('DestinyProgressionDefinition');
    seasonPassDefinitions = await ReturnEntry('DestinySeasonPassDefinition');
    objectiveDefinitions = await ReturnEntry('DestinyObjectiveDefinition');
    seasonDefinitions = await ReturnEntry('DestinySeasonDefinition');
    itemDefinitions = await ReturnEntry('DestinyInventoryItemDefinition');

    // Load first char on profile/last loaded char
    await LoadPrimaryCharacter(characters);

    // Check for passive reload
    if (isPassiveReload) {
        StopLoad();
        log(`-> Passive Reload Complete! [Elapsed: ${(new Date() - startTime)}ms]`);
    }
    else if (!isPassiveReload) {
        // Don't add the event listeners again when passive reloading
        await AddEventListeners();
    };

    setTimeout(() => {
        log(userStruct);
    }, 12_000);

};

// Run main
main()
.catch((error) => {
    console.error(error);
});

export { userStruct }