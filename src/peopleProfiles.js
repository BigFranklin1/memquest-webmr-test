// Editorial reading layers for the existing American Revolution learning graph.
// A contextual link does not imply that two people met or acted together.
export const PEOPLE_PROFILES = Object.freeze({
  "samuel-adams": {
    shortName: "Samuel Adams",
    introduction: "A pivotal political organizer, Adams helped turn resistance to parliamentary taxation into coordinated action. Through public meetings, print, and committees, he connected local grievances with a wider defense of colonial self-government.",
    roles: [
      { icon: "people", title: "Political organizer", body: "Connected town meetings and resistance networks, giving separate colonial grievances a common political voice." },
      { icon: "print", title: "Public communicator", body: "Used essays, public debate, and committees to frame resistance as a defense of colonial rights." },
    ],
    connections: [
      { id: "hancock", personId: "john-hancock", label: "John Hancock", kind: "ally", caption: "Political ally", detail: "Hancock's standing as a merchant and Adams's organizing helped connect commercial opposition with Boston's wider resistance movement." },
      { id: "hutchinson", personId: "thomas-hutchinson", label: "Hutchinson", kind: "opponent", caption: "Royal governor", detail: "Adams challenged the imperial authority that Hutchinson was charged with enforcing, especially during the tea crisis." },
      { id: "hewes", personId: "george-hewes", label: "George Hewes", kind: "context", caption: "Shared resistance", detail: "Hewes represents the working people who carried resistance into action. This is a connection through the movement, not a claim of personal coordination." },
      { id: "committees", icon: "people", label: "Resistance networks", kind: "ally", caption: "Organization", detail: "Meetings, print, and committees helped circulate arguments and coordinate opposition beyond a single neighborhood." },
      { id: "parliament", icon: "institution", label: "British Parliament", kind: "opponent", caption: "Contested authority", detail: "At the center of Adams's argument was Parliament's claimed authority to tax the colonies without their consent." },
    ],
  },
  "thomas-hutchinson": {
    shortName: "Thomas Hutchinson",
    introduction: "A Massachusetts-born governor caught between local anger and imperial instructions, Hutchinson defended the authority of the Crown. His insistence on enforcing customs rules made him a central figure in the confrontation over the tea ships.",
    roles: [
      { icon: "institution", title: "Royal governor", body: "Represented imperial authority in Massachusetts and sought to preserve what he understood as lawful government." },
      { icon: "document", title: "Enforcer of policy", body: "Maintained the customs requirements that prevented the tea ships from simply departing with their cargo." },
    ],
    connections: [
      { id: "adams", personId: "samuel-adams", label: "Samuel Adams", kind: "opponent", caption: "Political opponent", detail: "Adams presented imperial enforcement as overreach; Hutchinson saw the resistance movement as a threat to lawful order." },
      { id: "hancock", personId: "john-hancock", label: "John Hancock", kind: "opponent", caption: "Merchant opposition", detail: "Patriot merchants such as Hancock linked commercial grievances to broader opposition to imperial policy." },
      { id: "hewes", personId: "george-hewes", label: "George Hewes", kind: "context", caption: "Popular resistance", detail: "Hewes's later accounts offer a participant's perspective on the resistance that confronted the governor's authority." },
      { id: "crown", icon: "institution", label: "British Crown", kind: "ally", caption: "Imperial authority", detail: "As royal governor, Hutchinson was responsible for carrying out the Crown's instructions in Massachusetts." },
      { id: "customs", icon: "document", label: "Customs rules", kind: "context", caption: "Legal constraint", detail: "The Dartmouth's customs deadline made the dispute urgent. Explore its arrival record in Evidence for the administrative context." },
    ],
  },
  "george-hewes": {
    shortName: "George Hewes",
    introduction: "A Boston shoemaker and participant in the Tea Party, Hewes brings an artisan's perspective to the crisis. His vivid later recollections illuminate how ordinary people experienced resistance, while reminding us to compare memory with contemporary evidence.",
    roles: [
      { icon: "people", title: "Artisan and participant", body: "Represents the working Bostonians who gave physical force to the arguments of colonial resistance." },
      { icon: "document", title: "Remembered eyewitness", body: "His recollections preserve personal detail, but were recorded decades later and need careful comparison with other sources." },
    ],
    connections: [
      { id: "adams", personId: "samuel-adams", label: "Samuel Adams", kind: "context", caption: "Shared resistance", detail: "Adams organized political opposition; Hewes participated in the action. A shared cause is not evidence of a direct personal instruction." },
      { id: "hutchinson", personId: "thomas-hutchinson", label: "Hutchinson", kind: "opponent", caption: "Imperial policy", detail: "The governor's enforcement of customs requirements formed part of the political pressure surrounding the Tea Party." },
      { id: "hancock", personId: "john-hancock", label: "John Hancock", kind: "context", caption: "Another perspective", detail: "Compare Hewes's artisan experience with the position of a wealthy merchant and Patriot leader." },
      { id: "artisans", icon: "people", label: "Boston artisans", kind: "ally", caption: "Community", detail: "Artisans and working people were active participants in the resistance movement, not simply an audience for elite leaders." },
      { id: "gazette", icon: "document", label: "Boston Gazette", kind: "context", caption: "Source comparison", detail: "The contemporary newspaper account provides a useful comparison for Hewes's much later memories of the tea's destruction." },
    ],
  },
  "john-hancock": {
    shortName: "John Hancock",
    introduction: "A wealthy Boston merchant and prominent Patriot, Hancock connected commercial opposition with wider political resistance. His public standing gave the movement influence, while customs disputes made the relationship between trade and imperial authority intensely personal.",
    roles: [
      { icon: "institution", title: "Merchant leader", body: "Brought commercial influence and public standing to a movement resisting imperial trade and taxation policy." },
      { icon: "people", title: "Political ally", body: "Worked alongside Samuel Adams to connect Boston's resistance with a broader defense of colonial rights." },
    ],
    connections: [
      { id: "adams", personId: "samuel-adams", label: "Samuel Adams", kind: "ally", caption: "Political ally", detail: "Hancock's influence and Adams's organizing offered complementary sources of strength for Patriot opposition." },
      { id: "hutchinson", personId: "thomas-hutchinson", label: "Hutchinson", kind: "opponent", caption: "Imperial authority", detail: "Hutchinson defended the imperial system against which Hancock and other Patriot leaders organized." },
      { id: "hewes", personId: "george-hewes", label: "George Hewes", kind: "context", caption: "Artisan perspective", detail: "Hewes's experience provides a contrast to Hancock's elite commercial position within the same resistance movement." },
      { id: "merchants", icon: "people", label: "Boston merchants", kind: "ally", caption: "Commercial network", detail: "Trade, customs, and the East India Company's privileged position made commercial interests central to the political argument." },
      { id: "parliament", icon: "institution", label: "British Parliament", kind: "opponent", caption: "Trade and taxation", detail: "Parliament's regulation of colonial commerce and retention of the tea duty sharpened the dispute over colonial consent." },
    ],
  },
});
