export type Deal = {
  id: string;
  title: string;
  stage: string;
  amount: number;
  tags: string[];
  contactName: string;
  ownerAvatar?: string;
};

export type Stage = {
  key: string;
  label: string;
};

export type Pipeline = {
  id: string;
  stages: Stage[];
};
