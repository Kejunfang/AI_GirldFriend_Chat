import { ChannelType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: {
      externalId: "web:local-dev-user",
    },
    update: {
      displayName: "访客",
    },
    create: {
      externalId: "web:local-dev-user",
      displayName: "访客",
    },
  });

  const existingConversation = await prisma.conversation.findFirst({
    where: {
      userId: user.id,
    },
  });

  if (!existingConversation) {
    await prisma.conversation.create({
      data: {
        userId: user.id,
        channel: ChannelType.WEB,
        title: "新的聊天窗口",
      },
    });
  }

  console.info("Seed complete for local development user.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
