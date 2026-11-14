import { Card, Code, Container, Text, Title } from "@mantine/core";

export function EmptyBank() {
  return (
    <Container size="sm" py="xl">
      <Card>
        <Title order={2}>No questions loaded</Title>
        <Text mt="sm">Make sure the files in <Code>questions/</Code> are present.</Text>
      </Card>
    </Container>
  );
}
