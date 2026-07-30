/* eslint-disable no-var */

type MockUser = {
  id: string;
  email: string;
  name: string;
  userType: string;
};

type MockCampaign = {
  id: string;
  title: string;
  description: string;
  budget: number;
  status: string;
};

declare global {
  var testUtils: {
    createMockUser(): MockUser;
    createMockCampaign(): MockCampaign;
    mockApiResponse<T>(data: T, status?: number): {
      data: T;
      status: number;
      statusText: string;
      headers: Record<string, string>;
      config: Record<string, unknown>;
    };
    createMockStore<T>(initialState?: T): {
      getState(): T;
      dispatch: jest.Mock;
      subscribe: jest.Mock;
    };
  };
}

export {};
