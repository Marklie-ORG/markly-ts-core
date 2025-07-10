export interface SaveAnswerRequest {
  question: string;
  answer: string;
}

export interface OnboardingSteps {
  nameAnswered: boolean;
  isOwnerAnswered: boolean;
  organizationCreated: boolean;
  clientsAmountAnswered: boolean;
  advertisingPlatformsAnswered: boolean;
  communicationPlatformsAnswered: boolean;
  howDidYouHearAnswered: boolean;
  facebookConnected: boolean;
  onboardingFinished: boolean;
}
